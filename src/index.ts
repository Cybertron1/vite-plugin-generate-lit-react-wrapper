import { createManifest } from "./create-manifest";
import type { Plugin } from "vite";
import { transformWithEsbuild } from "vite";
import { createReactWrapper, createReactWrapperMetadata } from "./create-react";
import { createDts } from "./create-dts";

const virtualModuleId = "virtual:web-components-react-bindings";
const resolvedVirtualModuleId = "\0" + virtualModuleId;

type PluginOptions = {
  // "../WebComponents/src/**/!(*.stories|*.test).ts"
  globToLitComponents: string,
  // custom- -> needs to be removed
  componentPrefix: string,
  // ("Button") => web-components/button/button
  getComponentPath: (name: string) => string,
  // e.g ../WebComponents/dist to automatically reload when the lit src changes
  watchLitDist?: string,
  // e.g. dist or build
  outDir: string,
};

export default function vitePluginCreateLitReactWrapper(
  {
    globToLitComponents,
    componentPrefix,
    getComponentPath,
    watchLitDist,
    outDir
  }: PluginOptions): Plugin {
  return {
    name: "vite-plugin-generate-lit-react-wrapper",
    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
      return null;
    },
    load(this, id) {
      if (id === resolvedVirtualModuleId) {
        const manifest = createManifest(globToLitComponents);
        const metadata = createReactWrapperMetadata(manifest, componentPrefix, getComponentPath);


        const wrapper = createReactWrapper(metadata, componentPrefix);
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
      await createDts(wrapper, outDir);
    }
  };
}