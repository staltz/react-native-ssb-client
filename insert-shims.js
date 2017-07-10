const path = require("path");
const fs = require("fs");

/**
 * Sets shims in all modules in ${your-rn-project}/node_modules, under
 * 'react-native': {...} in package.json.
 */

const projectPath = path.join(process.cwd(), "../../");
const sourcePackageJsonPath = path.join(process.cwd(), "package.json");

const sourcePackageJson = JSON.parse(
  fs.readFileSync(sourcePackageJsonPath, "utf-8")
);

function insertShims(currentPath) {
  if (!fs.existsSync(path.join(currentPath, "./node_modules"))) {
    return;
  }

  const nodeModules = fs
    .readdirSync(path.join(currentPath, "./node_modules"))
    .map(m => path.join(currentPath, "./node_modules", m))
    .filter(m => fs.statSync(m).isDirectory)
    .filter(m => fs.existsSync(path.join(m, "package.json")));

  nodeModules.forEach(modulePath => {
    try {
      const packageJsonPath = path.join(modulePath, "package.json");
      const prevFileContent = fs.readFileSync(packageJsonPath, "utf-8");
      const packageJson = JSON.parse(prevFileContent);
      if ("react-native" in packageJson) {
        Object.keys(sourcePackageJson["react-native"]).forEach(moduleName => {
          if (!(moduleName in packageJson["react-native"])) {
            packageJson["react-native"][moduleName] =
              sourcePackageJson["react-native"][moduleName];
          }
        });
      } else {
        packageJson["react-native"] = sourcePackageJson["react-native"];
      }
      const nextFileContent = JSON.stringify(packageJson, null, "  ");
      fs.writeFileSync(packageJsonPath, nextFileContent, "utf-8");

      insertShims(modulePath);
    } catch (e) {
      console.error(e);
    }
  });
}

insertShims(projectPath);
