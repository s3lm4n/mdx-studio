import type {
  CheckStatus,
  PreflightCheck,
  PreflightReport,
  RuntimeCapabilities,
  SimulationRequest,
  MdxDeviceStatus,
} from "@mdx-studio/protocol";
import { RUN_MODE_INFO, getMdpValue, lintMdp, parseMdp } from "@mdx-studio/simulation-model";
import { MOCK_GROMACS_VERSION, MOCK_HOST, MOCK_RUNTIME_VERSION } from "./fixtures";
import { simulatedDigest } from "./hash";

/** Demo thresholds owned by the (mock) runtime. The desktop never sees or applies them. */
const DEMO_TEMPERATURE_WARN_C = 75;
const DEMO_TEMPERATURE_LIMIT_C = 90;

export interface PreflightContext {
  readonly request: SimulationRequest;
  readonly capabilities: RuntimeCapabilities;
  readonly device: MdxDeviceStatus;
  /** Another live job already holds the device. */
  readonly deviceBusyWith: string | null;
  readonly knownPaths: ReadonlySet<string>;
  readonly mdpText: string | null;
  readonly validationProfileIds: readonly string[];
  readonly nowIso: string;
}

type CheckDraft = Omit<PreflightCheck, "origin">;

function check(
  id: string,
  group: PreflightCheck["group"],
  title: string,
  status: CheckStatus,
  critical: boolean,
  detail: string,
): CheckDraft {
  return { id, group, title, status, critical, detail };
}

/**
 * Runtime-owned pre-flight policy (mock). Produces the report the desktop renders. The report's
 * `startPermitted` is decided here: false iff any critical check FAILs.
 */
export function evaluatePreflight(ctx: PreflightContext): PreflightReport {
  const { request, device } = ctx;
  const usesMdx = RUN_MODE_INFO[request.runMode].usesMdx;
  const drafts: CheckDraft[] = [];

  const referenced = [request.inputStructure, request.topology, request.mdp, request.checkpoint];
  const missing = referenced.filter(
    (path): path is string => path !== undefined && !ctx.knownPaths.has(path),
  );
  drafts.push(
    check(
      "inputs-present",
      "inputs",
      "Input files present",
      missing.length === 0 ? "PASS" : "FAIL",
      true,
      missing.length === 0
        ? "Structure, topology and MDP are present in the project."
        : `Not found in project: ${missing.join(", ")}`,
    ),
  );

  const lint = ctx.mdpText === null ? [] : lintMdp(ctx.mdpText);
  const lintErrors = lint.filter((issue) => issue.severity === "error");
  drafts.push(
    check(
      "mdp-valid",
      "inputs",
      "MDP parameters",
      ctx.mdpText === null
        ? "FAIL"
        : lintErrors.length > 0
          ? "FAIL"
          : lint.length > 0
            ? "WARN"
            : "PASS",
      true,
      ctx.mdpText === null
        ? "MDP file could not be read."
        : lint.length === 0
          ? "No structural problems found (mock check; grompp is not run in Phase 1)."
          : lint.map((issue) => `line ${issue.line}: ${issue.message}`).join(" "),
    ),
  );

  drafts.push(
    check(
      "runtime-version",
      "runtime",
      "Runtime version",
      "PASS",
      false,
      `Runtime ${MOCK_RUNTIME_VERSION}, protocol ${ctx.capabilities.protocolVersion} (simulated runtime).`,
    ),
  );
  drafts.push(
    check(
      "gromacs-version",
      "gromacs",
      "GROMACS version",
      ctx.capabilities.gromacs.detected ? "PASS" : "FAIL",
      true,
      ctx.capabilities.gromacs.detected
        ? `GROMACS ${MOCK_GROMACS_VERSION} (simulated detection).`
        : "GROMACS was not detected.",
    ),
  );

  const skipped = (id: string, group: PreflightCheck["group"], title: string): CheckDraft =>
    check(id, group, title, "SKIPPED", false, "Not applicable to the selected run mode.");
  const blockedByDevice = (id: string, title: string, critical: boolean): CheckDraft =>
    check(id, "device", title, "SKIPPED", critical, "Skipped: MDX device is not available.");

  if (!usesMdx) {
    drafts.push(
      skipped("tpr-compatibility", "gromacs", "TPR compatibility"),
      skipped("binary-checksum", "device", "Binary checksum"),
      skipped("device-detected", "device", "Device detected"),
      skipped("device-ready", "device", "Device ready"),
      skipped("firmware-checksum", "device", "Firmware / bitstream checksum"),
      skipped("pcie-link", "device", "PCIe / link status"),
      skipped("device-temperature", "device", "Device temperature"),
      skipped("device-clock", "device", "Device clock"),
      skipped("watchdog", "device", "Watchdog"),
      skipped("supported-kernel", "policy", "Supported kernel"),
    );
  } else {
    const detected = device.state !== "DISCONNECTED";
    drafts.push(
      check(
        "device-detected",
        "device",
        "Device detected",
        detected ? "PASS" : "FAIL",
        true,
        detected
          ? `${device.identity?.model ?? "MDX device"} detected (simulated).`
          : "No MDX device detected (simulated device is DISCONNECTED).",
      ),
    );

    if (!detected) {
      drafts.push(
        blockedByDevice("device-ready", "Device ready", true),
        blockedByDevice("firmware-checksum", "Firmware / bitstream checksum", true),
        blockedByDevice("pcie-link", "PCIe / link status", true),
        blockedByDevice("device-temperature", "Device temperature", true),
        blockedByDevice("device-clock", "Device clock", false),
        blockedByDevice("watchdog", "Watchdog", true),
      );
    } else {
      const holder = ctx.deviceBusyWith;
      const busy = holder !== null;
      const ready = device.state === "READY" && !busy;
      drafts.push(
        check(
          "device-ready",
          "device",
          "Device ready",
          ready ? "PASS" : "FAIL",
          true,
          busy
            ? `Device is assigned to job ${holder}. Stop it or wait for it to finish.`
            : device.state === "READY"
              ? "Device state is READY."
              : `Device state is ${device.state}; READY is required to start.`,
        ),
        check(
          "firmware-checksum",
          "device",
          "Firmware / bitstream checksum",
          device.state === "ERROR" ? "FAIL" : "PASS",
          true,
          device.state === "ERROR"
            ? (device.lastError?.message ?? "Device reports an error.")
            : `Firmware ${device.identity?.firmwareVersion ?? "unknown"} matches the allow-list (simulated).`,
        ),
      );

      const link = device.link;
      drafts.push(
        check(
          "pcie-link",
          "device",
          "PCIe / link status",
          link === null || link.status === "down"
            ? "FAIL"
            : link.status === "degraded"
              ? "WARN"
              : "PASS",
          true,
          link === null
            ? "No link information."
            : `Gen${link.generation} x${link.lanes}, link ${link.status} (simulated).`,
        ),
      );

      const temp = device.temperatureC;
      drafts.push(
        check(
          "device-temperature",
          "device",
          "Device temperature",
          temp === null || temp >= DEMO_TEMPERATURE_LIMIT_C
            ? "FAIL"
            : temp >= DEMO_TEMPERATURE_WARN_C
              ? "WARN"
              : "PASS",
          true,
          temp === null
            ? "No temperature reading."
            : `${temp.toFixed(1)} °C (simulated; demo thresholds are runtime-owned).`,
        ),
        check(
          "device-clock",
          "device",
          "Device clock",
          (device.clockMHz ?? 0) >= 300 ? "PASS" : "WARN",
          false,
          `${String(device.clockMHz ?? 0)} MHz (simulated).`,
        ),
        check(
          "watchdog",
          "device",
          "Watchdog",
          device.watchdog.state === "TRIPPED" ? "FAIL" : "PASS",
          true,
          device.watchdog.state === "TRIPPED"
            ? "Watchdog is TRIPPED."
            : `Watchdog ${device.watchdog.state}, timeout ${String(device.watchdog.timeoutMs)} ms (simulated; armed by the runtime at start).`,
        ),
      );
    }

    drafts.push(
      check(
        "binary-checksum",
        "device",
        "Binary checksum",
        "PASS",
        true,
        `sha256 ${simulatedDigest("mdrun-binary").slice(0, 16)}… matches the allow-list (simulated).`,
      ),
    );

    const scheme =
      ctx.mdpText === null ? undefined : getMdpValue(parseMdp(ctx.mdpText), "cutoff-scheme");
    const unsupported = scheme !== undefined && scheme.trim().toLowerCase() !== "verlet";
    drafts.push(
      check(
        "supported-kernel",
        "policy",
        "Supported kernel",
        unsupported ? "FAIL" : "PASS",
        true,
        unsupported
          ? `cutoff-scheme '${scheme}' is not supported by the MDX kernel (demo policy).`
          : "Requested kernel configuration is supported (demo policy).",
      ),
      check(
        "tpr-compatibility",
        "gromacs",
        "TPR compatibility",
        "PASS",
        true,
        "Generated TPR is compatible with the selected MDX profile (simulated; grompp is not run in Phase 1).",
      ),
    );
  }

  const policyProblems: string[] = [];
  if (request.resources.threads > MOCK_HOST.cpuCores) {
    policyProblems.push(
      `threads ${String(request.resources.threads)} exceed ${String(MOCK_HOST.cpuCores)} available`,
    );
  }
  if (usesMdx && !ctx.capabilities.mdxProfiles.some((p) => p.id === request.mdxProfile)) {
    policyProblems.push(`unknown MDX profile '${request.mdxProfile ?? ""}'`);
  }
  if (
    RUN_MODE_INFO[request.runMode].usesValidationProfile &&
    !ctx.validationProfileIds.includes(request.validationProfile ?? "")
  ) {
    policyProblems.push(`unknown validation profile '${request.validationProfile ?? ""}'`);
  }
  drafts.push(
    check(
      "runtime-policy",
      "policy",
      "Runtime-policy compatibility",
      policyProblems.length === 0 ? "PASS" : "FAIL",
      true,
      policyProblems.length === 0
        ? "Request satisfies runtime policy (demo policy)."
        : `Policy violations: ${policyProblems.join("; ")}.`,
    ),
  );

  return finalizeReport(
    request.runMode,
    ctx.nowIso,
    drafts.map((d) => ({ ...d, origin: "simulated" as const })),
  );
}

/** Derives verdict and the start gate from individual checks. */
export function finalizeReport(
  runMode: SimulationRequest["runMode"],
  generatedAt: string,
  checks: PreflightCheck[],
): PreflightReport {
  const blocking = checks.filter((c) => c.critical && c.status === "FAIL").map((c) => c.id);
  const verdict = checks.some((c) => c.status === "FAIL")
    ? "FAIL"
    : checks.some((c) => c.status === "WARN")
      ? "WARN"
      : "PASS";
  return {
    runMode,
    generatedAt,
    origin: "simulated",
    checks,
    verdict,
    startPermitted: blocking.length === 0,
    blockingCheckIds: blocking,
  };
}
