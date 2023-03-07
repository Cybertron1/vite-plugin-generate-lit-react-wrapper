import { createManifest } from "./create-manifest";
import type { Plugin, ResolvedConfig } from "vite";
import { transformWithEsbuild } from "vite";
import { createReactWrapper, createReactWrapperMetadata } from "./create-react";
import { createDts } from "./create-dts";
import path from "node:path";

export const virtualModuleId = "virtual:web-components-react-bindings";
const resolvedVirtualModuleId = "\0" + virtualModuleId;

type PluginOptions = {
  // "../WebComponents/src/**/!(*.stories|*.test).ts"
  globToLitComponents: string,
  // custom- -> needs to be removed
  prefix: string,
  // ("Button") => web-components/button/button or ../button/button -> seen from the virtual import file
  getComponentPath: (name: string) => string,
} & ({
  // is the virtual import in the same repo as the lit elements
  samePackageOutput: true
  watchLitDist?: never,
} | {
  samePackageOutput: false,
  // e.g ../WebComponents/dist to automatically reload when the lit src changes
  watchLitDist: string
});

export default function vitePluginCreateLitReactWrapper(
  {
    globToLitComponents,
    prefix,
    getComponentPath,
    watchLitDist,
    samePackageOutput,
  }: PluginOptions): Plugin {
  let config: ResolvedConfig;
  return {
    name: "vite-plugin-generate-lit-react-wrapper",
    configResolved(resolvedConfig) {
      config = resolvedConfig
    },
    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
      // if we generate the wrapper in the same package we need to resolve the relative paths to absolute ones
      if (samePackageOutput && id[0] === ".") {
        const srcPath = globToLitComponents.split("*")[0];
        const flattenPath = id.replace(srcPath, "")
          .replace(/\.\.\//g, "");
        return path.join(process.cwd(), `${ srcPath }/${ flattenPath }.ts`);
      }
      return null;
    },
    load(this, id) {
      if (id === resolvedVirtualModuleId) {
        const manifest = createManifest(globToLitComponents);
        const metadata = createReactWrapperMetadata(manifest, prefix, getComponentPath);
        const wrapper = createReactWrapper(metadata, prefix);
        this.cache.set("wrapper", wrapper);
        return wrapper;
      }
      return null;
    },
    async transform(src, id) {
      if (id === resolvedVirtualModuleId) {
        watchLitDist && this.addWatchFile(watchLitDist);
        const { code, map } = await transformWithEsbuild(src, id, { loader: "ts" });

        return {
          code,
          map
        };
      }
      return null;
    },
    async closeBundle() {
      const wrapper = this.cache.get("wrapper");
      const path = samePackageOutput ? globToLitComponents : undefined;
      await createDts(wrapper, config.build.outDir, path);
    }
  };
}
