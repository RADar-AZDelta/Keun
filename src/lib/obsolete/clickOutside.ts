// Copyright 2023 RADar-AZDelta
// SPDX-License-Identifier: gpl3+
// A method to check if the user clicks outside of the element
export default function clickOutside(node: Node): { destroy(): void } {
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