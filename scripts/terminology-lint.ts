// @anchor script:anchors.terminology-lint links=interface:anchors.terminology-lint,test:anchors.terminology-lint-contract,doc:governance.terminology note="Fails on restricted terminology across scoped N1Hub governance surfaces."
import {
  TERMINOLOGY_LINT_EXPLICIT_FILES,
  TERMINOLOGY_LINT_SCAN_DIRS,
  scanTerminologyLint,
} from "../lib/anchors";

const ROOT = process.cwd();

function main(): void {
  const asJson = process.argv.slice(2).includes("--json");
  const report = scanTerminologyLint(ROOT, {
    explicitTargets: TERMINOLOGY_LINT_EXPLICIT_FILES,
    scanRoots: TERMINOLOGY_LINT_SCAN_DIRS,
  });

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  }

  const totalIssues = report.markerIssues.length + report.violations.length;

  if (totalIssues > 0) {
    if (!asJson) {
      console.error(
        `Terminology lint failed: found ${totalIssues} issue(s) (${report.markerIssues.length} marker issue(s), ${report.violations.length} restricted terminology occurrence(s)).`,
      );
      for (const markerIssue of report.markerIssues) {
        console.error(
          `- ${markerIssue.file}:${markerIssue.line} [${markerIssue.kind}] ${markerIssue.snippet}`,
        );
      }
      for (const violation of report.violations) {
        console.error(
          `- ${violation.file}:${violation.line} [${violation.term}] ${violation.snippet}`,
        );
      }
      console.error(
        "Use canonical terms from docs/TERMINOLOGY.md and keep the lint scope limited to governed anchor surfaces.",
      );
    }
    process.exit(1);
  }

  if (!asJson) {
    console.log(`Terminology lint passed (${report.targets.length} files scanned).`);
  }
}

main();
