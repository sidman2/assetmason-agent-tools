import { argv, exit, stderr } from "node:process";

const registryUrl = "https://registry.npmjs.org/";

const statusToLabel = (status) => {
  if (status === 200) return "VERSION_ALREADY_EXISTS";
  if (status === 404) return "PACKAGE_EXISTS_VERSION_ABSENT";
  return "UNEXPECTED_NPM_BEHAVIOR";
};

export async function checkExactVersion(spec, options = {}) {
  if (!spec || !spec.includes("@")) {
    return {
      ok: false,
      label: "MALFORMED_RESPONSE",
      message: `Invalid package spec: ${spec ?? ""}`
    };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const url = new URL(spec.replace("@", "/"), registryUrl).toString();

  let response;
  try {
    response = await fetchImpl(url, {
      headers: {
        accept: "application/json"
      }
    });
  } catch (error) {
    return {
      ok: false,
      label: "REGISTRY_UNREACHABLE",
      message: error instanceof Error ? error.message : String(error)
    };
  }

  let bodyText = "";
  try {
    bodyText = await response.text();
  } catch (error) {
    return {
      ok: false,
      label: "MALFORMED_RESPONSE",
      message: error instanceof Error ? error.message : String(error)
    };
  }

  if (response.status === 200) {
    return {
      ok: false,
      label: "VERSION_ALREADY_EXISTS",
      message: `${spec} is already published at ${registryUrl}`
    };
  }

  if (response.status === 404) {
    return {
      ok: true,
      label: "PACKAGE_EXISTS_VERSION_ABSENT",
      message: `${spec} is absent from ${registryUrl}`
    };
  }

  const snippet = bodyText.trim().slice(0, 200);
  return {
    ok: false,
    label: statusToLabel(response.status),
    message: `Unexpected registry response ${response.status}${snippet ? `: ${snippet}` : ""}`
  };
}

async function main() {
  const spec = argv[2];
  if (!spec) {
    stderr.write("Usage: node scripts/release-version-guard.mjs <package@version>\n");
    exit(2);
  }

  const result = await checkExactVersion(spec);
  if (result.ok) {
    return;
  }

  stderr.write(`${result.label}: ${result.message}\n`);
  exit(result.label === "PACKAGE_EXISTS_VERSION_ABSENT" ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
