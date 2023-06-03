/**
 * Mark on an image
 */
class Mark {

    static SHAPE_CIRCLE = 'circle';
    static SHAPE_RECTANGLE = 'rectangle';
    static SHAPE_POLYGON = 'polygon';

    /**
     * Unique identifier of the mark, should be auto-generated for a new mark.
     * Maximum length is 50 characters.
     * @type {string}
     */
    key = '';

    /**
     * Label that is shown when a mark is selected.
     * Maximum length is 10 characters.
     * @type {string}
     */
    label = '';

    /**
     * Color of the mark
     * @type {string}
     */
    color = '#D8E5F4';


    /**
     * Shape of the mark
     * @type {string}
     */
    shape = Mark.SHAPE_CIRCLE;

    /**
     * Horizontal position of the mark in pixels on the full-width page image
     * @type {string}
     */
    x_position = 0;

    /**
     * Vertical porizontal position of the mark in pixels on the full-width page image
     * @type {string}
     */
    y_position = 0;

    /**
     * Width of a rectangle
     * @type {integer}
     */
    width = 0;

    /**
     * Height of a rectangle
     * @type {integer}
     */
    height = 0;

    /**
     * Path of the following positions of a polygon
     * Each array element is a pair of offsets from the x_position and y_position
     * Example: [ [5,-1], [6,-2], [7,0], ... ]
     * @type {array}
     */
    poly_path = [];


    /**
     * Constructor - get properties from a data object
     * @param {object} data
     */
    constructor(data) {
        if (data.key !== undefined && data.key !== null) {
            this.key = data.key.toString()
        } else if (this.key == '') {
            // get a random key
            this.key = 'mark' + Math.random().toString();
        }
        if (data.label !== undefined && data.label !== null) {
            this.label = data.label.toString()
        }
        if (data.color !== undefined && data.color !== null) {
            this.color = data.color.toString()
        }
        if ([Mark.SHAPE_CIRCLE, Mark.SHAPE_RECTANGLE, Mark.SHAPE_POLYGON].includes(data.shape)) {
            this.shape = data.shape;
        }
        if (data.x_position !== undefined && data.x_position !== null) {
            this.x_position = parseInt(data.x_position);
        }
        if (data.y_position !== undefined && data.y_position !== null) {
            this.y_position = parseInt(data.y_position);
        }
        if (data.width !== undefined && data.width !== null) {
            this.width = parseInt(data.width);
        }
        if (data.height !== undefined && data.height !== null) {
            this.height = parseInt(data.height);
        }
        if (Array.isArray(data.poly_path)) {
            data.poly_path.forEach(element => {
                if (Array.isArray(element) && element.length == 2) {
                    this.poly_path.push(parseInt(element[0], parseInt(element[1])));
                }
            });
        }
    }

    /**
     * Get a plain data object from the properties
     * @return {object}
     */
    getData() {
        return {
            key: this.key,
            label: this.label,
            color: this.color,
            shape: this.shape,
            x_position: this.x_position,
            y_position: this.y_position,
            poly_path: this.poly_path
        }
    }
}

export default Mark;
