import { writable } from 'svelte/store'

const showPopup = writable<boolean>(false)

const showAuthor = writable<boolean>(false)

export { showPopup, showAuthor }
