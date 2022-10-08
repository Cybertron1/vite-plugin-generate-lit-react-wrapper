import { Project } from "ts-morph";
import { virtualModuleId } from "./index";

const getVirtualFilePath = (project: Project) => {
  const isReactBindingImport = (module) => module.getModuleSpecifierValue() === virtualModuleId;
  const virtualPath = project.getSourceFile(f => f.getImportDeclarations().some(isReactBindingImport));
  return virtualPath?.getFilePath() || "index.ts";
};

export const createDts = async (reactSrc: string, outPath: string, srcPath?: string) => {
  const project = new Project({ compilerOptions: { outDir: outPath, declaration: true } });
  srcPath && project.addSourceFilesAtPaths(srcPath);
  const virtualFileLocation = getVirtualFilePath(project);
  const reactSourceFile = project.createSourceFile(virtualFileLocation, reactSrc, { overwrite: true });
  project.resolveSourceFileDependencies();
  await project.emit({ emitOnlyDtsFiles: true, targetSourceFile: reactSourceFile });
};