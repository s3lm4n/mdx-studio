import {
  JobEventSchema,
  JobRecordSchema,
  MdpDocumentSchema,
  MdxDeviceStatusSchema,
  PreflightReportSchema,
  ProjectDetailSchema,
  ProjectSummarySchema,
  ProvenanceRecordSchema,
  RunSummarySchema,
  RuntimeCapabilitiesSchema,
  RuntimeHealthSchema,
  TelemetrySnapshotSchema,
  ValidationProfileSchema,
  ValidationResultSchema,
} from "@mdx-studio/protocol";
import { describe, expect, it } from "vitest";
import { SCENARIO_IDS } from "../src";
import { createRuntime, mdxRequest, nvtRequest, validationRequest } from "./helpers";

describe.each(SCENARIO_IDS)("mock runtime contract conformance (%s)", (scenario) => {
  it("every operation returns data that parses against the protocol and is marked simulated", async () => {
    const { runtime } = createRuntime(scenario);

    expect(RuntimeHealthSchema.parse(await runtime.getHealth()).origin).toBe("simulated");
    const caps = RuntimeCapabilitiesSchema.parse(await runtime.getCapabilities());
    expect(caps.origin).toBe("simulated");
    expect(caps.mdxDevice.integration).toBe("mock");
    expect(caps.gromacs.origin).toBe("simulated");
    expect(MdxDeviceStatusSchema.parse(await runtime.getDeviceStatus()).origin).toBe("simulated");

    const projects = await runtime.listProjects();
    expect(projects.length).toBeGreaterThan(0);
    for (const project of projects) {
      expect(ProjectSummarySchema.parse(project).origin).toBe("simulated");
      const detail = ProjectDetailSchema.parse(await runtime.getProject(project.id));
      for (const file of detail.files.filter((f) => f.kind === "mdp")) {
        MdpDocumentSchema.parse(await runtime.readMdp(project.id, file.path));
      }
    }

    for (const mode of [nvtRequest(), mdxRequest(), validationRequest()]) {
      PreflightReportSchema.parse(await runtime.runPreflight(mode));
    }

    for (const profile of await runtime.listValidationProfiles()) {
      expect(ValidationProfileSchema.parse(profile).origin).toBe("simulated");
    }
    for (const result of await runtime.listValidationResults()) {
      expect(ValidationResultSchema.parse(result).origin).toBe("simulated");
    }

    const runs = await runtime.listRuns();
    expect(runs.length).toBeGreaterThan(0);
    for (const run of runs) {
      expect(RunSummarySchema.parse(run).origin).toBe("simulated");
      const provenance = ProvenanceRecordSchema.parse(await runtime.getProvenance(run.runId));
      expect(provenance.origin).toBe("simulated");
      const events = await runtime.getJobEvents(run.jobId);
      for (const event of events) {
        expect(JobEventSchema.parse(event).origin).toBe("simulated");
      }
      for (const snapshot of await runtime.getTelemetryHistory(run.jobId)) {
        expect(TelemetrySnapshotSchema.parse(snapshot).origin).toBe("simulated");
      }
    }
    for (const job of await runtime.listJobs()) {
      expect(JobRecordSchema.parse(job).origin).toBe("simulated");
    }
    runtime.dispose();
  });
});
