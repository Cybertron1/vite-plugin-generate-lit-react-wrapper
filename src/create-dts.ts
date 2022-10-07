import { Project } from "ts-morph";

export const createDts = async (reactSrc: string, outDir: string) => {
  const project = new Project({ compilerOptions: { outDir, declaration: true } });
  const reactSourceFile = project.createSourceFile("react/index.ts", reactSrc);
  project.resolveSourceFileDependencies();
  await project.emit({ emitOnlyDtsFiles: true, targetSourceFile: reactSourceFile });
};