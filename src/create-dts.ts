import { Project } from "ts-morph";

export const createDts = async (reactSrc: string, outPath: string, virtualFileLocation: string, srcPath?: string) => {
  const project = new Project({ compilerOptions: { outDir: outPath, declaration: true } });
  srcPath && project.addSourceFilesAtPaths(srcPath);
  const reactSourceFile = project.createSourceFile(virtualFileLocation, reactSrc, { overwrite: true });
  project.resolveSourceFileDependencies();
  await project.emit({ emitOnlyDtsFiles: true, targetSourceFile: reactSourceFile });
};