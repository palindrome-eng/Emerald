const path = require("path");
const programDir = path.join(__dirname, "programs/emerald");
const idlDir = path.join(__dirname, "target/idl");
const sdkDir = path.join(__dirname, "js", "emerald/generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
	idlGenerator: "anchor",
	programName: "emerald",
	programId: "2HLsq8QGhRnUUwuukCKLNdpvNc4utW6AQVV1VoY9jgEd",
	idlDir,
	sdkDir,
	binaryInstallDir,
	programDir,
};
