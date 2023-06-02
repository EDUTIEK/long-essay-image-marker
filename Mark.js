/**
 * Mark on an image
 */
class Mark {

    static SHAPE_POINT = 'point';
    static SHAPE_RECTANGLE = 'rectangle';
    static SHAPE_POLYGON = 'polygon';


    /**
     * Unique identifier of the mark
     * Should be auto-generated for a new mark
     * @type {string}
     */
    key = '';

    /**
     * Label that is shown when a mark is selected
     * @type {string}
     */
    label = '';

    /**
     * Indicates whether it is an own mark or the mark of another corrector
     * @type {boolean}
     */
    is_own = true;

    /**
     * Indicates whether it marks an excellent passage
     * @type {boolean}
     */
    is_excellent = false;

    /**
     * Indicates whether it marks a cardinal failure
     * @type {boolean}
     */
    is_cardinal = false;

    /**
     * Indicates whether the mark should be highlighted as selected
     * @type {boolean}
     */
    is_selected = false;

    /**
     * Ty
     * @type {string}
     */
    shape = Mark.SHAPE_POINT;

    /**
     * X Position of the mark
     * @type {string}
     */
    x_position = '';

    /**
     * Y Position of the mark
     * @type {string}
     */
    y_position = '';


    /**
     * Width of a mark (rectangle)
     * @type {integer}
     */
    width = 0;

    /**
     * Height of the mark (rectangle)
     * @type {integer}
     */
    height = 0;


    /**
     * Path of positions of a polygon
     * Each array element os a pair ox x and y position
     * Example: [ [3,5], [4,6], [5,7], ... ]
     * @type {array}
     */
    poly_path = [];
}

export default Mark;
