// @anchor script:anchors.lint-usage links=interface:anchors.usage-lint,test:anchors.usage-lint-contract,doc:governance.anchors-spec note="Fails on fragile shell redirection patterns for anchor JSON commands."
import { USAGE_LINT_TARGET_FILES, scanUsageLint } from "../lib/anchors";

const ROOT = process.cwd();

function main(): void {
  const asJson = process.argv.slice(2).includes("--json");
  const report = scanUsageLint(ROOT, USAGE_LINT_TARGET_FILES);

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  }

  if (report.violations.length > 0) {
    if (!asJson) {
      console.error(
        `Anchor usage lint failed: found ${report.violations.length} fragile redirect pattern(s).`,
      );
      for (const violation of report.violations) {
        console.error(
          `- ${violation.file}:${violation.line} [${violation.command}] ${violation.snippet}`,
        );
      }
      console.error(
        "Use script-managed outputs (for example npm run anchors:coverage -- --out=.anchors-coverage.json) instead of shell redirection.",
      );
    }
    process.exit(1);
  }

  if (!asJson) {
    console.log(`Anchor usage lint passed (${report.targets.length} files scanned).`);
  }
}

main();
