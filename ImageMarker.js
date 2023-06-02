import Mark from "./Mark";

/**
 * ImageMarker class
 * Set marks on an image interactively
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
     * Callback when a marker is created
     * This should be overridden by the onCreation parameter of the constructor
     * @param {Mark} created - Definition of the mark that is created
     */

    onCreation(created) {}

    /**
     * Callback when a marker is selected
     * This should be overridden by the onSelction parameter of the constructor
     * @param {Mark} selected - Definition of the mark that is selected
     */
    onSelection(selected) {}


    /**
     * Show the image of a page and all marks on it
     * @param {integer} pageNumber - number of the page - used as prefix for labels
     * @param {string} imagePath - path of the image that should be shown
     * @param {Mark[]} marks - list of mark objects that should be shown
     */
    showPage(pageNumber, imagePath, marks) {

    }

    /**
     * Add a new mark to the page
     * e.g. if an external filter changes tle list of shown marks
     * @param {Mark} mark
     */
    addMark(mark) {

    }

    /**
     * Remove a mark from the page
     * e.g. if an external filter changes tle list of shown marks
     * @param shape
     */
    removeMark(mark) {

    }

    /**
     * Update and redraw a mark
     * e.g. after a mark is selected or after its rating is changed
     * @param {Mark} mark
     */
    updateMark(mark) {

    }
}

export default ImageMarker;

