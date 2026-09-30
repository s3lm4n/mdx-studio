import type {
  CommandProvenance,
  JobRecord,
  ProvenanceRecord,
  RunStatus,
  ValidationStatus,
} from "@mdx-studio/protocol";
import { PROTOCOL_VERSION } from "@mdx-studio/protocol";
import { RUN_MODE_INFO } from "@mdx-studio/simulation-model";
import { MOCK_GROMACS_VERSION, MOCK_MDX_FIRMWARE_VERSION, MOCK_RUNTIME_VERSION } from "./fixtures";
import { sha256Hex, simulatedDigest } from "./hash";

const SAFE_TOKEN = /^[A-Za-z0-9_@%+=:,./-]+$/;

/** Renders argv for human inspection. Display only; nothing ever executes this string. */
function quoteForDisplay(argv: readonly string[]): string {
  return argv
    .map((token) => (SAFE_TOKEN.test(token) ? token : `'${token.replaceAll("'", "'\\''")}'`))
    .join(" ");
}

function command(purpose: string, argv: string[], workingDirectory: string): CommandProvenance {
  return { purpose, argv, display: quoteForDisplay(argv), workingDirectory };
}

/**
 * Mock Provenance Provider. It fabricates the records a real runtime would capture. The commands
 * below are NEVER executed: they exist so the provenance UI can be built against realistic
 * shapes. Phase 2/3 replace this with records written by the runtime's real command builder.
 */
export function buildProvenance(args: {
  job: JobRecord;
  mdpText: string;
  status: RunStatus;
  validationStatus: ValidationStatus;
  tprGenerated: boolean;
}): ProvenanceRecord {
  const { job } = args;
  const request = job.request;
  const usesMdx = RUN_MODE_INFO[request.runMode].usesMdx;
  const out = request.outputDirectory;
  const tpr = `${out}/${request.outputName}.tpr`;

  const commands: CommandProvenance[] = [
    command(
      "Pre-process inputs into a run input file",
      [
        "gmx",
        "grompp",
        "-f",
        request.mdp,
        "-c",
        request.inputStructure,
        "-p",
        request.topology,
        ...(request.checkpoint !== undefined ? ["-t", request.checkpoint] : []),
        "-o",
        tpr,
      ],
      ".",
    ),
    command(
      "Run the simulation",
      [
        "gmx",
        "mdrun",
        "-s",
        tpr,
        "-deffnm",
        `${out}/${request.outputName}`,
        "-nt",
        String(request.resources.threads),
      ],
      ".",
    ),
  ];

  return {
    runId: job.runId,
    jobId: job.id,
    origin: "simulated",
    startedAt: job.startedAt ?? job.createdAt,
    finishedAt: job.finishedAt,
    resultStatus: args.status,
    validationStatus: args.validationStatus,
    gromacsVersion: MOCK_GROMACS_VERSION,
    runtimeVersion: MOCK_RUNTIME_VERSION,
    protocolVersion: PROTOCOL_VERSION,
    mdxFirmware: usesMdx
      ? { version: MOCK_MDX_FIRMWARE_VERSION, bitstreamChecksum: simulatedDigest("bitstream") }
      : null,
    binaryHashes: [
      { name: "gmx (simulated)", algorithm: "sha256", digest: simulatedDigest("gmx-binary") },
      ...(usesMdx
        ? [
            {
              name: "mdx-runtime (simulated)",
              algorithm: "sha256" as const,
              digest: simulatedDigest("mdx-runtime-binary"),
            },
          ]
        : []),
    ],
    tprHash: args.tprGenerated ? simulatedDigest(`tpr:${job.runId}`) : null,
    // A real hash of the (demo) MDP text that was used.
    mdpHash: sha256Hex(args.mdpText),
    commands,
    runtimeConfiguration: {
      runMode: request.runMode,
      stage: request.stage,
      threads: request.resources.threads,
      computeTarget: request.resources.computeTarget,
      continuation: request.continuation,
      ...(request.mdxProfile !== undefined ? { mdxProfile: request.mdxProfile } : {}),
      ...(request.validationProfile !== undefined
        ? { validationProfile: request.validationProfile }
        : {}),
    },
    logs: [
      {
        name: "md.log (simulated)",
        relativePath: `${out}/${request.outputName}.log`,
        sizeBytes: 184_320,
      },
      {
        name: "runtime events (simulated)",
        relativePath: `${out}/events.jsonl`,
        sizeBytes: 12_288,
      },
    ],
  };
}
