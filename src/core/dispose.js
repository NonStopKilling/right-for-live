export function disposeObject3D(root) {
  root.traverse((child) => {
    if (child.geometry) {
      child.geometry.dispose();
    }

    disposeMaterial(child.material);
  });

  while (root.children.length > 0) {
    root.remove(root.children[0]);
  }
}

export function disposeMaterial(material) {
  if (!material) {
    return;
  }

  if (Array.isArray(material)) {
    material.forEach(disposeMaterial);
    return;
  }

  Object.values(material).forEach((value) => {
    if (value?.isTexture && typeof value.dispose === 'function') {
      value.dispose();
    }
  });

  if (typeof material.dispose === 'function') {
    material.dispose();
  }
}

export function disposeRenderer(renderer) {
  renderer.renderLists?.dispose();
  renderer.dispose();
}
