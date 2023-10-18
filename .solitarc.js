const path = require("path");
const programDir = path.join(__dirname, "programs/emerald");
const idlDir = path.join(__dirname, "target/idl");
const sdkDir = path.join(__dirname, "js", "emerald/generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
	idlGenerator: "anchor",
	programName: "emerald",
	programId: "5Kmi2sHYKD76GySjL9Tkoi64eLwGpiZCW7zUpbpJ8B5m",
	idlDir,
	sdkDir,
	binaryInstallDir,
	programDir,
};
