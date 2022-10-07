import path from "node:path";
import { pascalCase } from "pascal-case";

type ReactWrapperMetadata = {
  customEvents: boolean;
  imports: string[];
  components: {
    name: string;
    tagName: string;
    events: string;
  }[]
}

type Component = {
  tagName: string,
  modulePath: string,
  events: {
    reactName: string,
    name: string
    description: string
  }[]
}

function getAllComponents(metadata): Component[] {
  const allComponents = [];

  metadata.modules.map(module => {
    module.declarations?.map(declaration => {
      if (declaration.customElement) {
        const component = declaration;
        const modulePath = module.path;

        if (component) {
          // @ts-ignore
          allComponents.push(Object.assign(component, { modulePath }));
        }
      }
    });
  });

  return allComponents;
}

export const createReactWrapper = (infos: ReactWrapperMetadata, prefix: string) => {
  const componentPrefix = pascalCase(prefix);
  return `
${ infos.customEvents ? "import type {EventName} from '@lit-labs/react';" : "" }
import * as React from 'react';
import { createComponent } from '@lit-labs/react';
${ infos.imports.join("\n") }

${ infos.components.map(component => {
    return `
export const ${ componentPrefix }${ component.name }Component = createComponent(
  React,
  '${ component.tagName }',
  ${ component.name }Component,
  {
    ${ component.events }
  }
);
`;
  }).join("\n") }
`;
};

export const createReactWrapperMetadata = (metadata: Record<string, unknown>, prefix: string, getComponentPath: (name: string) => string): ReactWrapperMetadata => {
  const components = getAllComponents(metadata);
  const createEvent = (event) => {
    let type = "EventName";
    if (event.description) {
      type += `<${ event.description }>`;
    }

    return `${ event.reactName }: '${ event.name }' as ${ type }`;
  };


  return components.reduce((obj: ReactWrapperMetadata, component): ReactWrapperMetadata => {
    const tagWithoutPrefix = component.tagName.replace(prefix, "");
    const sourceName = path.parse(component.modulePath).name;
    const importPath = getComponentPath(sourceName);
    const events = (component.events || []).map(createEvent).join(",\n");
    const imports = (component.events || []).map(event => event.description).join(",");

    const componentName = pascalCase(tagWithoutPrefix);

    return {
      ...obj,
      ...(events && { customEvents: true }),
      imports: [
        ...obj.imports,
        `import ${ componentName }Component from '${ importPath }';`,
        ...(imports.length > 0 ? [ `import type {${ imports }} from '${ importPath }';` ] : [])
      ],
      components: [
        ...obj.components,
        {
          name: componentName,
          tagName: component.tagName,
          events
        }
      ]
    };

  }, {
    customEvents: false,
    imports: [],
    components: []
  });
};