export function requireElement<ElementType extends Element>(
  selector: string,
  expectedType: abstract new () => ElementType,
  root: ParentNode = document
): ElementType {
  const element = root.querySelector(selector)
  if (!(element instanceof expectedType)) {
    throw new Error(`Élément introuvable : ${selector}`)
  }
  return element
}
