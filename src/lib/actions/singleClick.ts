export function singleClick(node: Node, data: any) {
  const handleSingleClick = (event: Event) => {
    event.preventDefault()
    node.dispatchEvent(new CustomEvent('singleClick', { detail: { index: data.index } }))
  }

  document.addEventListener('click', handleSingleClick, true)

  return {
    destroy() {
      document.removeEventListener('click', handleSingleClick, true)
    },
  }
}
