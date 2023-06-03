import Mark from "./Mark";

/**
 * ImageMarker class - set marks on an image interactively
 *
 * @param {HTMLElement} element - DOM element to which function will be applied
 * @param {function} onCreation - Callback when a mark is created
 * @param {function} onSelection - Callback when a mark is selected
 */
class ImageMarker {

    /**
     * Container Element
     * @type {HTMLElement}
     */
    el = null;

    /**
     * Constructor - see class parameters
     */
    constructor(element, onCreation, onSelection) {
        if (!element) {
            throw new Error('Missing anchor element');
        }
        this.el = element;

        if (onCreation instanceof Function) {
            this.onCreation = onCreation;
        }


        if (onSelection instanceof Function) {
            this.onSelection = onSelection;
        }
    }

    /**
     * Callback when a mark is created.
     * This is overridden by the onCreation parameter of the constructor
     * @param {Mark} created - Definition of the mark that is created
     */

    onCreation(created) {}

    /**
     * Callback when a marker is selected.
     * This is overridden by the onSelction parameter of the constructor
     * @param {Mark} selected - Definition of the mark that is selected
     */
    onSelection(selected) {}


    /**
     * Show the image of a page and all marks on it
     * @param {string} imageUrl - url of the image that should be shown
     * @param {Mark[]} marks - list of mark objects that should be shown
     */
    showPage(imageUrl, marks) {
        console.log([Date.now(), 'showPage', imageUrl, marks]);
    }

    /**
     * Add a new mark to the page, e.g. if an external filter changes the list of shown marks.
     * @param {Mark} mark
     */
    addMark(mark) {
        console.log([Date.now(), 'addMark', mark]);
    }

    /**
     * Update and redraw a mark, e.g. after a rating is changed
     * @param {Mark} mark
     */
    updateMark(mark) {
        console.log([Date.now(), 'updateMark', mark]);
    }

    /**
     * Remove a mark from the page, e.g. if an external filter changes tle list of shown marks
     * @param {string} key - unique key of the mark
     */
    removeMark(key) {
        console.log([Date.now(), 'removeMark', key]);
    }

    /**
     * Update the label of a mark.
     * Labels are created and changed outside the ImageMarker.
     * They are sorted by position on the page and may be relabled when a mark is created or deleted.
     * A label is only shown when a mark is selected. In that case it needs to be redrawn.
     *
     * @param {string} key
     * @param {string} label
     */
    updateLabel(key, label) {
        console.log([Date.now(), 'updateLabel', key, label]);
    }

    /**
     * Show a mark as selected.
     * This should highlight the mark and show its label.
     * @param {string} key
     */
    selectMark(key) {
        console.log(Date.now(), 'selectMark', key);
    }
}

export default ImageMarker;

