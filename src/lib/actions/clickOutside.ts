export function clickOutside(node: Node) {
    const handleClick = (event: MouseEvent) => {
        console.log("HERE ", node.contains(event.target as Node))
        if (!node.contains(event.target as Node)) {
            console.log("WOW HERE")
            node.dispatchEvent(new CustomEvent("outClick"));
        }
    };

    document.addEventListener("click", handleClick, true);

    return {
        destroy() {
            document.removeEventListener("click", handleClick, true);
        }
    };
}
