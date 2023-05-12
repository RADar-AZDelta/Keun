// A method to check if the user double clicks on an element
export function doubleClick(node: Node) {
  const handleDoubleClick = (event: Event) => {
    node.dispatchEvent(new CustomEvent('doubleClick'))
  }

  document.addEventListener('dblclick', handleDoubleClick, true)

  return {
    destroy() {
      document.removeEventListener('dblclick', handleDoubleClick, true)
    },
  }
}
