import type { Element, Root, RootContent } from "hast";
import { INCOMPLETE_LINK_HREF } from "./parse-incomplete-markdown";

function isIncompleteLink(node: RootContent): node is Element {
  return (
    node.type === "element" &&
    node.tagName === "a" &&
    node.properties.href === INCOMPLETE_LINK_HREF
  );
}

function visitChildren(children: RootContent[]): void {
  for (let i = children.length - 1; i >= 0; i -= 1) {
    const child = children[i];
    if (child.type !== "element") continue;
    visitChildren(child.children);
    if (isIncompleteLink(child)) {
      children.splice(i, 1, ...child.children);
    }
  }
}

/**
 * Replaces placeholder links for still-streaming URLs with their plain text.
 */
export function rehypeUnwrapIncompleteLinks() {
  return (tree: Root) => {
    visitChildren(tree.children);
  };
}
