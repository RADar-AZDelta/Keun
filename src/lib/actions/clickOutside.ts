// A method to check if the user clicks outside of the element
export function clickOutside(node: Node) {
  const handleClick = (event: MouseEvent) => {
    if (!node.contains(event.target as Node)) {
      node.dispatchEvent(new CustomEvent('outClick'))
    }
  }

  document.addEventListener('mousedown', handleClick, true)

  return {
    destroy() {
      document.removeEventListener('mousedown', handleClick, true)
    },
  }
}
