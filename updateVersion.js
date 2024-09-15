import packageJSON from "./package.json" with { type: "json" };
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

(async () => {
    // Load required dist files
    const version = packageJSON.version;
    const root = process.cwd();
    const files = [
        join(root, "dist/commonjs/utils/general.js"),
        join(root, "dist/esm/utils/general.js"),
    ];

    // Replace package version in all files
    for (const file of files) {
        const fileContent = await readFile(file, "utf-8");
        const newContent = fileContent.replace("APP_VERSION", version);
        await writeFile(file, newContent);
    }
})();
