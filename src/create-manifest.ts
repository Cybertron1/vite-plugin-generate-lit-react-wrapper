import { readFileSync } from "node:fs";
import {
  create,
  litPlugin,
  ts
} from "@custom-elements-manifest/analyzer/src/browser-entrypoint.js";
import { pascalCase } from "pascal-case";
import fs from "node:fs";
import { globbySync } from "globby";

const customPlugins = [
  {
    name: "package-data",
    packageLinkPhase({ customElementsManifest }) {
      const { name, description, version, license } = JSON.parse(fs.readFileSync("./package.json", "utf8"));
      customElementsManifest["package"] = { name, description, version, license };
    }
  },
  {
    name: "react-event-names",
    analyzePhase({ ts, node, moduleDoc }) {
      switch (node.kind) {
        case ts.SyntaxKind.ClassDeclaration: {
          const className = node.name.getText();
          const classDoc = moduleDoc?.declarations?.find(declaration => declaration.name === className);
          if (classDoc?.events) {
            classDoc.events.forEach(event => {
              event.reactName = `on${ pascalCase(event.name) }`;
            });
          }
        }
      }
    }
  }
];


function createModule(path: string) {
  const source = readFileSync(path).toString();

  return ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.ES2015,
    true
  );
}

let added = false;

function createManifest(glob: string) {
  const paths = globbySync(glob);
  const modules = paths.map(createModule);
  const plugins = customPlugins;
  if (!added) {
    plugins.push(...litPlugin());
    added = true;
  }
  return create({
    modules,
    plugins,
    dev: false
  });
}

export {
  createModule,
  createManifest
};