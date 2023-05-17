// A method to check if the user double clicks on an element
export function doubleClick(node: Node, data: any) {
  const handleDoubleClick = (event: Event) => {
    event.preventDefault()
    node.dispatchEvent(new CustomEvent('doubleClick', { detail: { index: data.index, renderedRow: data.renderedRow } }))
  }

  document.addEventListener('dblclick', handleDoubleClick, true)

  return {
    destroy() {
      document.removeEventListener('dblclick', handleDoubleClick, true)
    },
  }
}
