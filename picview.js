"use strict";

/*
 * ==========
 * picview.js
 * ==========
 * 
 * Defines the PicView class and some private helper classes.
 * 
 * This class is attached to a specific <canvas> element during
 * construction and then manages the element.
 */

/*
 * PicViewMap class
 * ================
 * 
 * This private class represents a mapping from the image bitmap to the
 * canvas.
 */

/*
 * Constructor.
 * 
 * Constructing a new view will result in a view that shows the whole
 * image, centered in the canvas.  For other types of views, you need to
 * use the instance functions on an existing view.
 * 
 * Only the aspect ratio of the given image dimensions is important, so
 * you can use a view for any rescaled image that has the same aspect
 * ratio.
 * 
 * All given dimensions must be greater than zero.
 * 
 * Parameters:
 * 
 *   cnv_w : number - the width of the canvas in pixels
 * 
 *   cnv_h : number - the height of the canvas in pixels
 * 
 *   img_w : number - the width of the image in pixels
 * 
 *   img_h : number - the height of the image in pixels
 */
function PicViewMap(cnv_w, cnv_h, img_w, img_h) {

  var sw, sh, sc;
  var scale;
  var rx, ry, rw, rh;

  // Check parameters
  if ((typeof(cnv_w) !== "number") || (typeof(cnv_h) !== "number") ||
      (typeof(img_w) !== "number") || (typeof(img_h) !== "number")) {
    throw new TypeError();
  }
  if ((!isFinite(cnv_w)) || (!isFinite(cnv_h)) ||
      (!isFinite(img_w)) || (!isFinite(img_h))) {
    throw "Non-finite dimensions!";
  }
  if ((!(cnv_w > 0.0)) || (!(cnv_h > 0.0)) ||
      (!(img_w > 0.0)) || (!(img_h > 0.0))) {
    throw "Invalid dimensions!";
  }

  // _canvas_width and _canvas_height store the dimensions of the canvas
  //
  this._canvas_width  = cnv_w;
  this._canvas_height = cnv_h;
  
  // _image_width and _image_height store the dimensions of the image
  //
  this._image_width  = img_w;
  this._image_height = img_h;
  
  // Determine how many times the width of the canvas the width of the
  // image is, and do the same for height
  //
  sw = img_w / cnv_w;
  sh = img_h / cnv_h;

  // The composite scaling factor is the maximum of sw and sh, which
  // indicates the dimension of the image that will be more difficult to
  // fit in this canvas
  //
  sc = sw;
  if (sh > sc) {
    sc = sh;
  }
  
  // If composite scaling factor does not exceed 1.0, then the image
  // fits within the canvas without any scaling, so set scale to 1.0 in
  // that case; otherwise, scale is the inverse of the composite scaling
  // factor
  //
  if (sc <= 1.0) {
    scale = 1.0;
  } else {
    scale = 1.0 / sc;
  }

  // We now know the scaling we will apply to the image, so compute the
  // scaled width and height of the image
  //
  rw = img_w * scale;
  rh = img_h * scale;
  
  // Compute the X and Y coordinates so as to center the image
  //
  rx = (cnv_w - rw) / 2.0;
  ry = (cnv_h - rh) / 2.0;

  // _dx _dy _dw _dh define the area of the canvas that the view mapping
  // blits into
  //
  this._dx = rx;
  this._dy = ry;
  this._dw = rw;
  this._dh = rh;
}

/*
 * Public instance functions
 * -------------------------
 */

/*
 * Check whether the given canvas and image dimensions match the canvas
 * and image dimensions stored within this object.
 * 
 * This is used to check whether the view mapping is still current.
 * 
 * If you are using a resized image, pass the dimensions of the
 * full-size image to this check function.
 * 
 * Parameters:
 * 
 *   cnv_w : number - the current canvas width
 * 
 *   cnv_h : number - the current canvas height
 * 
 *   img_w : number - the current image width
 * 
 *   img_h : number - the current image height
 * 
 * Return:
 * 
 *   true if view is still current, false if view is no longer current
 */
PicViewMap.prototype.check = function(cnv_w, cnv_h, img_w, img_h) {
  
  // Check parameters
  if ((typeof(cnv_w) !== "number") || (typeof(cnv_h) !== "number") ||
      (typeof(img_w) !== "number") || (typeof(img_h) !== "number")) {
    throw new TypeError();
  }
  
  // Check against state
  if ((this._canvas_width  === cnv_w) &&
      (this._canvas_height === cnv_h) &&
      (this._image_width   === img_w) &&
      (this._image_height  === img_h)) {
    return true;
  } else {
    return false;
  }
};

/*
 * Modify the current view with a translate operation.
 * 
 * (new_x, new_y) is the new position of the primary touch involved in
 * the drag, while (last_x, last_y) is the last registered position.
 * The view will be translated so that the point touched on the image
 * appears to stay with the location of the touch.  However, the X and Y
 * display coordinates are clamped so that the canvas viewport can't be
 * moved beyond the image boundaries.
 * 
 * Parameters:
 * 
 *   new_x : number - the new X coordinate in the drag
 * 
 *   new_y : number - the new Y coordinate in the drag
 * 
 *   last_x : number - the last X coordinate in the drag
 * 
 *   last_y : number - the last Y coordinate in the drag
 * 
 * Return:
 * 
 *   true if the internal state actually changed; false if no change was
 *   caused by this translate operation
 */
PicViewMap.prototype.translate =
                              function(new_x, new_y, last_x, last_y) {
  var disp_x, disp_y;
  var rx, ry;
  var changed;
  
  // Check parameters
  if ((typeof(new_x) !== "number") || (typeof(new_y) !== "number") ||
      (typeof(last_x) !== "number") || (typeof(last_y) !== "number")) {
    throw new TypeError();
  }
  if ((!isFinite(new_x)) || (!isFinite(new_y)) ||
      (!isFinite(last_x)) || (!isFinite(last_y))) {
    throw "Non-finite coordinates!";
  }
  
  // Compute X and Y displacement
  disp_x = new_x - last_x;
  disp_y = new_y - last_y;
  
  // Compute the new X and Y coordinates that would result from applying
  // these displacements
  rx = this._dx + disp_x;
  ry = this._dy + disp_y;
  
  // Adjust X to be in proper range
  if (this._dw <= this._canvas_width) {
    // Viewport width does not exceed canvas width, so X coordinate
    // should be such that the view is centered
    rx = (this._canvas_width - this._dw) / 2.0;
    
  } else {
    // Viewport width exceeds canvas width; first clamp X so it does not
    // exceed zero
    if (rx > 0.0) {
      rx = 0.0;
    }
    
    // Then, clamp X for right boundary of image
    if (rx < this._canvas_width - this._dw) {
      rx = this._canvas_width - this._dw;
    }
  }
  
  // Adjust Y to be in proper range
  if (this._dh <= this._canvas_height) {
    // Viewport height does not exceed canvas height, so Y coordinate
    // should be such that the view is centered
    ry = (this._canvas_height - this._dh) / 2.0;
    
  } else {
    // Viewport height exceeds canvas height; first clamp Y so it does
    // not exceed zero
    if (ry > 0.0) {
      ry = 0.0;
    }
    
    // Then, clamp Y for bottom boundary of image
    if (ry < this._canvas_height - this._dh) {
      ry = this._canvas_height - this._dh;
    }
  }
  
  // Check whether actual change
  if ((this._dx === rx) && (this._dy === ry)) {
    changed = false;
  } else {
    changed = true;
  }
  
  // Update coordinates
  this._dx = rx;
  this._dy = ry;
  
  // Return whether actual change
  return changed;
};

/*
 * Modify the current view with a zoom operation.
 * 
 * new_d is the new distance to secondary touch and last_d is the last
 * registered distance to secondary touch, for computing the change in
 * scaling factor.  If you are simulating a zoom from a non-touch
 * source, set last_d to 1.0 and new_d to the scaling factor you want.
 * 
 * max_s is the maximum scaling factor from the original image
 * dimensions that is allowed.  This must be greater than or equal to
 * 1.0.  If the zoom would normally result in an even larger image, it
 * is clamped to this zoom size.  Setting a value of 1.0 means that 100%
 * display with one image pixel equaling one display pixel is the
 * maximum zoom-in.  Setting a value of 2.0 means that 200% display with
 * one image pixel equaling two display pixels is the maximum zoom-in,
 * and so forth.
 * 
 * full_v is a PicViewMap that stores the fully zoomed-out view.  No
 * zoom operation may zoom out more than this, with clamping used to
 * prevent that limit from being exceeded.  full_v must have the same
 * canvas and image dimensions as this object or an exception is thrown.
 * 
 * Parameters:
 * 
 *   new_d : number - the new distance to secondary touch
 * 
 *   last_d : number - the last distance to secondary touch
 * 
 *   max_s : number - the maximum scaling factor
 * 
 *   full_v : PicViewMap - the fully zoomed-out view
 * 
 * Return:
 * 
 *   true if the internal state actually changed; false if no change was
 *   caused by this zoom operation
 */
PicViewMap.prototype.zoom = function(new_d, last_d, max_s, full_v) {
  
  var scale, min_scale, max_scale;
  var dim_i, dim_f, dim_v;
  var changed;
  var new_w, new_h;
  
  // Check parameters
  if ((typeof(new_d) !== "number") || (typeof(last_d) !== "number") ||
      (typeof(max_s) !== "number")) {
    throw new TypeError();
  }
  if ((!isFinite(new_d)) || (!isFinite(last_d)) ||
      (!isFinite(max_s))) {
    throw "Non-finite parameters!";
  }
  if ((!(new_d >= 0.0)) || (!(last_d >= 0.0))) {
    throw "Distances out of range!";
  }
  if (!(max_s >= 1.0)) {
    throw "Max scaling out of range!";
  }
  if (!(full_v instanceof PicViewMap)) {
    throw new TypeError();
  }
  if ((full_v._canvas_width  !== this._canvas_width ) ||
      (full_v._canvas_height !== this._canvas_height) ||
      (full_v._image_width   !== this._image_width  ) ||
      (full_v._image_height  !== this._image_height )) {
    throw "Incompatible full view!";
  }
  
  // If last_d is zero, or new_d and last_d are equal, then do nothing
  if ((last_d === 0.0) || (last_d === new_d)) {
    return false;
  }
  
  // Calculate the scaling change selected by the user
  scale = new_d / last_d;
  
  // Get the dimension of the longer axis of the fully zoomed-out view,
  // the natural image dimensions, and the current view of the image
  if (this._image_width >= this._image_height) {
    dim_i = this._image_width;
    dim_f = full_v._dw;
    dim_v = this._dw;
    
  } else {
    dim_i = this._image_height;
    dim_f = full_v._dh;
    dim_v = this._dh;
  }
  
  // The minimum allowed scaling value scales the current view down to
  // the fully zoomed-out view size
  min_scale = dim_f / dim_v;
  
  // If the scale selected by the user is less than or equal to the
  // minimum scale, then we will copy in the fully zoomed-out view
  if (scale <= min_scale) {
    // Figure out first whether anything actually changes
    if ((full_v._dx === this._dx) &&
        (full_v._dy === this._dy) &&
        (full_v._dw === this._dw) &&
        (full_v._dh === this._dh)) {
      changed = false;
    } else {
      changed = true;
    }
    
    // Copy full view to here
    this.copyFrom(full_v);
    
    // Return whether there was a change
    return changed;
  }
  
  // If we got here then the minimum limit does not apply; the maximum
  // limit is the scale that would take us from the current view to the
  // natural image dimension multiplied by the maximum scaling factor
  max_scale = (dim_i * max_s) / dim_v;
  
  // If the scale selected by the user is greater than the maximum
  // scale, then set it to the maximum scaling value and continue on
  if (scale >= max_scale) {
    scale = max_scale;
  }
  
  // scale now stores the actual scaling value we need to apply; if this
  // is 1.0, then nothing happens
  if (scale === 1.0) {
    return false;
  }
  
  // If we got here, we actually need to change the view by the new
  // scaling factor; figure out the new width and new height
  new_w = this._dw * scale;
  new_h = this._dh * scale;
  
  // Adjust the X and Y coordinates of the mapping so that the canvas
  // will still be centered on the same point
  this._dx = this._dx + (((this._canvas_width - (2.0 * this._dx))
                            * (this._dw - new_w))
                          / (2.0 * this._dw));
  this._dy = this._dy + (((this._canvas_height - (2.0 * this._dy))
                            * (this._dh - new_h))
                          / (2.0 * this._dh));
  
  // Set the new width and height
  this._dw = new_w;
  this._dh = new_h;
  
  // Adjust X to be in proper range
  if (this._dw <= this._canvas_width) {
    // Viewport width does not exceed canvas width, so X coordinate
    // should be such that the view is centered
    this._dx = (this._canvas_width - this._dw) / 2.0;
    
  } else {
    // Viewport width exceeds canvas width; first clamp X so it does not
    // exceed zero
    if (this._dx > 0.0) {
      this._dx = 0.0;
    }
    
    // Then, clamp X for right boundary of image
    if (this._dx < this._canvas_width - this._dw) {
      this._dx = this._canvas_width - this._dw;
    }
  }
  
  // Adjust Y to be in proper range
  if (this._dh <= this._canvas_height) {
    // Viewport height does not exceed canvas height, so Y coordinate
    // should be such that the view is centered
    this._dy = (this._canvas_height - this._dh) / 2.0;
    
  } else {
    // Viewport height exceeds canvas height; first clamp Y so it does
    // not exceed zero
    if (this._dy > 0.0) {
      this._dy = 0.0;
    }
    
    // Then, clamp Y for bottom boundary of image
    if (this._dy < this._canvas_height - this._dh) {
      this._dy = this._canvas_height - this._dh;
    }
  }
  
  // If we got here, view is definitely changed because of non-1.0
  // scaling
  return true;
};

/*
 * Replace the state of this view object with the copied state of a
 * given view object.
 * 
 * Parameters:
 * 
 *   vw : PicViewMap - the map to copy into this object
 */
PicViewMap.prototype.copyFrom = function(vw) {
  
  // Check parameter
  if (!(vw instanceof PicViewMap)) {
    throw new TypeError();
  }
  
  // Replace state
  this._canvas_width  = vw._canvas_width;
  this._canvas_height = vw._canvas_height;
  this._image_width   = vw._image_width;
  this._image_height  = vw._image_height;
  this._dx            = vw._dx;
  this._dy            = vw._dy;
  this._dw            = vw._dw;
  this._dh            = vw._dh;
};

/*
 * Check whether the state stored within this view object is equal to
 * the state stored within another view object.
 * 
 * Parameters:
 * 
 *   vw : PicViewMap - the object to compare to this one
 * 
 * Return:
 * 
 *   true if the objects are equivalent, false if not
 */
PicViewMap.prototype.equalTo = function(vw) {
  
  // Check parameter
  if (!(vw instanceof PicViewMap)) {
    throw new TypeError();
  }
  
  // Compare state
  if ((this._canvas_width  === vw._canvas_width ) &&
      (this._canvas_height === vw._canvas_height) &&
      (this._image_width   === vw._image_width  ) &&
      (this._image_height  === vw._image_height ) &&
      (this._dx            === vw._dx           ) &&
      (this._dy            === vw._dy           ) &&
      (this._dw            === vw._dw           ) &&
      (this._dh            === vw._dh           )) {
    return true;
  } else {
    return false;
  }
};

/*
 * Create a new view object with a copy of the state of this object.
 * 
 * Return:
 * 
 *   a new PicViewMap that has an internal state that is a copy of this
 *   object
 */
PicViewMap.prototype.makeCopy = function() {
  var obj;
  
  // Create new object
  obj = new PicViewMap(
            this._canvas_width,
            this._canvas_height,
            this._image_width,
            this._image_height);
  
  // Copy current state into new object
  obj.copyFrom(this);
  
  // Return result
  return obj;
};

/*
 * Return the X coordinate of the blit destination on the canvas.
 * 
 * Return:
 * 
 *   the destination X coordinate
 */
PicViewMap.prototype.getDX = function() {
  return this._dx;
};

/*
 * Return the Y coordinate of the blit destination on the canvas.
 * 
 * Return:
 * 
 *   the destination Y coordinate
 */
PicViewMap.prototype.getDY = function() {
  return this._dy;
};

/*
 * Return the width of the blit destination on the canvas.
 * 
 * Return:
 * 
 *   the destination width
 */
PicViewMap.prototype.getDW = function() {
  return this._dw;
};

/*
 * Return the height of the blit destination on the canvas.
 * 
 * Return:
 * 
 *   the destination height
 */
PicViewMap.prototype.getDH = function() {
  return this._dh;
};

/*
 * PicViewImage class
 * ==================
 * 
 * This private class is used by PicView to asynchronously load an
 * image, and then create an ImageBitmap for blitting the image as well
 * as another ImageBitmap at reduced resolution for realtime operations.
 */

/*
 * Constructor.
 */
function PicViewImage() {
  
  var selfref;
  
  // Get a self reference for callbacks
  selfref = this;
  
  // _img will be a new <img> element that is used behind the scenes for
  // loading images
  //
  this._img = new Image();
  
  // Images load asynchronously, so register a load event handler on the
  // <img> element that invokes our _handleImageLoad() function
  //
  this._img.onload = function() {
    selfref._handleImageLoad();
  };
  
  // _bmpFull and _bmpFast are the full-resolution and fast-preview
  // versions of the image as ImageBitmap objects; these remain
  // undefined while loading and scaling is in progress, and when there
  // is no loaded image; if _bmpFull is defined and _bmpFast is
  // undefined, it means use _bmpFull also as the "fast" bitmap
  //
  this._bmpFull = undefined;
  this._bmpFast = undefined;
  
  // _fastPix is the approximate total number of pixels that _bmpFast
  // should have
  //
  this._fastPix = 76800;
  
  // _genid starts at zero and increments each time a new load operation
  // begins; this is used so that if previously running asynchronous
  // operations then complete, they can detect that they are no longer
  // current
  //
  this._genid = 0;
  
  // _fready can store a client function that is called with no
  // parameters when image loading is complete
  //
  this._fready = undefined;
}

/*
 * Private instance functions
 * --------------------------
 */

/*
 * Function invoked whenever the asynchronous loading of the internal
 * <img> is complete.
 * 
 * This will start the asynchronous processes of loading _bmpFull and
 * _bmpFast.  If both of these complete successfully AND the _genid
 * hasn't changed in the meantime, then the _fready callback will be
 * invoked.
 */
PicViewImage.prototype._handleImageLoad = function() {
  
  var selfref;
  var original_genid, la, w, h, ar;
  
  // Get self reference for callbacks
  selfref = this;
  
  // Only proceed if picture successfully loaded
  if (this._img.complete &&
        (this._img.naturalWidth > 0) &&
        (this._img.naturalHeight > 0)) {
    
    // Store the _genid right now so that when asynchronous loading
    // completes we can make sure we haven't moved on in the meantime
    original_genid = this._genid;
    
    // Immediately start asynchronously creating an ImageBitmap of the
    // <img> we just loaded and add the Promise to the load array
    la = [];
    la.push(createImageBitmap(this._img));
    
    // If the total number of pixels in the image exceeds our fastPix
    // threshold, then compute the dimensions of the fast preview image
    // and also add a Promise for the fast preview image to the load
    // array
    if (this._img.naturalWidth * this._img.naturalHeight
          > this._fastPix) {
      
      // Get the natural aspect ratio of the image
      ar = this._img.naturalWidth / this._img.naturalHeight;
      
      // Compute the height and then the width of the resized image
      h = Math.floor(Math.sqrt(this._fastPix / ar));
      w = Math.floor(h * ar);
      
      // Make sure both are at least two
      if (h < 2) {
        h = 2;
      }
      if (w < 2) {
        w = 2;
      }
      
      // Add a Promise for the resized image to the load array
      la.push(createImageBitmap(this._img, {
        "resizeWidth": w,
        "resizeHeight": h
      }));
    }
    
    // Proceed when all loading operations have asynchronously resolved
    Promise.all(la).then(function(ra) {
      // Success, so first of all check if the generation is still the
      // same, ignoring the results if it is not
      if (selfref._genid !== original_genid) {
        return;
      }
      
      // Store the image bitmaps
      if (ra.length === 1) {
        selfref._bmpFull = ra[0];
        selfref._bmpFast = undefined;
        
      } else if (ra.length === 2) {
        selfref._bmpFull = ra[0];
        selfref._bmpFast = ra[1];
        
      } else {
        throw "Unexpected";
      }
      
      // Invoke ready handler if defined
      if (selfref._fready) {
        selfref._fready();
      }
      
    }, function(re) {
      // Something went wrong
      console.log("Failed to load image bitmaps!");
    });
  }
};

/*
 * Public instance functions
 * -------------------------
 */

/*
 * Begin asynchronously loading a new image.
 * 
 * If another asynchronous image load is currently in progress, it will
 * be canceled.
 * 
 * src is the source URL to load within an internal <img> element.
 * 
 * Before calling this, use handleReady() to define a handler for when
 * the loading operation completes.
 * 
 * If there is an error during loading, the handleReady handler will
 * never get called.
 * 
 * Parameters:
 * 
 *   src : string - the URL of the image to load
 */
PicViewImage.prototype.load = function(src) {
  
  // Check parameter
  if (typeof(src) !== "string") {
    throw new TypeError();
  }
  
  // Increment _genid so that any results of prior operations get
  // ignored
  (this._genid)++;
  
  // Close any stored bitmaps
  if (this._bmpFull !== undefined) {
    this._bmpFull.close();
    this._bmpFull = undefined;
  }
  if (this._bmpFast !== undefined) {
    this._bmpFast.close();
    this._bmpFast = undefined;
  }
  
  // Begin loading the new image
  this._img.src = src;
};

/*
 * Register a handler for when an image load has completed and the image
 * bitmaps are ready.
 * 
 * This handler takes no parameters.  If a handler is already defined,
 * it is replaced by the new handler.  If null is passed, any existing
 * handler is undefined.
 * 
 * When the handler is called, ready() will return true.  You can then
 * use getBitmap() to get the loaded bitmaps.
 * 
 * Parameters:
 * 
 *   f : function - the function to call when ready after load
 */
PicViewImage.prototype.handleReady = function(f) {
  // Unload if null
  if (f === null) {
    this._fready = undefined;
    return;
  }
  
  // Check parameter
  if (typeof(f) !== "function") {
    throw new TypeError();
  }
  
  // Store new handler
  this._fready = f;
};

/*
 * Check whether image loading is complete.
 * 
 * Do not call this is a loop to detect image loading completion.
 * Instead, use a handleReady handler.
 * 
 * Return:
 * 
 *   true if image loading complete, false if not
 */
PicViewImage.prototype.ready = function() {
  if (this._bmpFull !== undefined) {
    return true;
  } else {
    return false;
  }
};

/*
 * Get an ImageBitmap for the loaded image.
 * 
 * This can only be used when ready() returns true.
 * 
 * If you request a fast preview bitmap, the fast preview bitmap will be
 * returned if it exists, else the full bitmap will be returned.
 * 
 * Parameters:
 * 
 *   fast : boolean - true to request a fast bitmap, false for full
 *   resolution bitmap
 */
PicViewImage.prototype.getBitmap = function(fast) {
  
  // Check state
  if (this._bmpFull === undefined) {
    throw "Image not ready!";
  }
  
  // Check parameter
  if (typeof(fast) !== "boolean") {
    throw new TypeError();
  }
  
  // Return appropriate bitmap
  if (fast) {
    // Fast preview request, return it if it exists, else the full size
    if (this._bmpFast !== undefined) {
      return this._bmpFast;
    } else {
      return this._bmpFull;
    }
    
  } else {
    // Fast preview not requested, so return full size
    return this._bmpFull;
  }
};

/*
 * Get the natural width of the full-size loaded image.
 * 
 * Only available when ready().
 * 
 * Return:
 * 
 *   the natural width of the full-size loaded image
 */
PicViewImage.prototype.getWidth = function() {
  
  // Check state
  if (this._bmpFull === undefined) {
    throw "Image not ready!";
  }
  
  // Return desired information
  return this._bmpFull.width;
};

/*
 * Get the natural height of the full-size loaded image.
 * 
 * Only available when ready().
 * 
 * Return:
 * 
 *   the natural height of the full-size loaded image
 */
PicViewImage.prototype.getHeight = function() {
  
  // Check state
  if (this._bmpFull === undefined) {
    throw "Image not ready!";
  }
  
  // Return desired information
  return this._bmpFull.height;
};

/*
 * PicViewInputDriver class
 * ========================
 * 
 * This private class is used by PicView to handle input events from the
 * browser and translate them into higher-level input events that
 * PicView then handles.
 */

/*
 * Constructor.
 * 
 * Pass the HTMLCanvasElement that this driver should handle events for.
 * The constructor will register the driver instance as the target for
 * the relevant canvas events.
 * 
 * After construction, you can use the public interface of this class to
 * register high-level event handlers and change certain properties that
 * control how the input driver works.
 * 
 * Parameters:
 * 
 *   canvas : HTMLCanvasElement - the <canvas> that this object will
 *   manage input events from
 */
function PicViewInputDriver(canvas) {
  
  var selfref;
  
  // Get self reference for use in callbacks
  selfref = this;
  
  // Check parameter
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new TypeError();
  }
  
  // The _canvas property stores the canvas we received
  //
  this._canvas = canvas;
  
  // The _active property is an array of two elements; if both elements
  // are undefined, then no pointer is down; if first element defined
  // but second undefined then one pointer down and first element has
  // its pointer ID; if both elements defined then two pointers down and
  // first element is primary pointer ID and second element is secondary
  // pointer ID
  //
  this._active = [undefined, undefined];
  
  // The _pcx and _pcy properties store the last client position (NOT
  // transformed into canvas space) that was read for the primary
  // pointer, but only when active array has at least one defined
  // element; this is used for computing distance values for the
  // secondary pointer
  //
  this._pcx = undefined;
  this._pcy = undefined;
  
  // The _bcx and _bcy properties store the client position (NOT
  // transformed into canvas space) that was read when the primary
  // pointer was last placed down, but only when active array has at
  // least one defined element; this is used to compute the maximum
  // distance the pointer has traveled on the screen while it is down
  //
  this._bcx = undefined;
  this._bcy = undefined;
  
  // The _bmaxd property is a running statistic that indicates the
  // maximum SQUARE of the distance that the pointer has strayed from
  // (bcx, bcy) while it has been down; only available while active
  // array has at least one defined element
  //
  this._bmaxd = undefined;
  
  // The _htime property stores the ID of a timeout that was started
  // when the pointer was placed down, which when it occurs may cause a
  // hold event if the pointer hasn't strayed too far from its original
  // position and there was never a double event; only defined while
  // active array has at least one defined element and timeout hasn't
  // run out yet
  //
  this._htime = undefined;
  
  // The _dbl property is a boolean that is set if at any point during
  // the drag operation there was a double event; only defined while
  // active array has at least one defined element
  //
  this._dbl = undefined;
  
  // _ppscroll_line and _ppscroll_page are the number of pixels per
  // mouse wheel line scroll and mouse wheel page scroll, respectively
  //
  this._ppscroll_line = 10;
  this._ppscroll_page = 50;
  
  // The _dthr property is the SQUARE of the maximum distance that the
  // primary pointer may travel during a drag operation for the drag
  // operation to still possibly generate a hold
  //
  this._dthr = 100;
  
  // The _tthr property is the number of milliseconds that the pointer
  // must be down for a hold event to possibly be triggered
  //
  this._tthr = 1000;
  
  // The _ovx and _ovy properties are the X overlay and Y overlay
  // distances; zero values mean overlay not active for that dimension,
  // positive values mean overlay comes from left or top, negative
  // values mean overlay comes from right or bottom; if overlay defined
  // in both dimensions, the resulting full overlay area is the
  // INTERSECTION of the overlay areas in both dimensions; if the
  // primary pointer goes down in the overlay area, then this is handled
  // as an overlay click and does NOT cause the primary pointer to be
  // registered in the active array
  //
  this._ovx = 0;
  this._ovy = 0;
  
  // Callbacks that may be defined to indicate client should handle
  // various events; see the descriptions in the public instance
  // functions for specifications of each of these
  this._fbegin  = undefined;
  this._fend    = undefined;
  this._fdouble = undefined;
  this._fsingle = undefined;
  this._fdrag   = undefined;
  this._fzoom   = undefined;
  this._fhold   = undefined;
  this._fover   = undefined;
  this._fhover  = undefined;
  this._fscroll = undefined;
  
  // Register touch event handlers
  this._canvas.addEventListener('touchstart', function(ev) {
    var i, tc;
    
    // Indicate we are handling this event
    ev.preventDefault();
    
    // Run each changed touch through the handler
    for(i = 0; i < ev.changedTouches.length; i++) {
      tc = ev.changedTouches.item(i);
      selfref._handleTouchDown(tc.identifier, tc.clientX, tc.clientY);
    }
  });
  
  this._canvas.addEventListener('touchmove', function(ev) {
    var i, tc;
    
    // Indicate we are handling this event
    ev.preventDefault();
    
    // Run each changed touch through the handler
    for(i = 0; i < ev.changedTouches.length; i++) {
      tc = ev.changedTouches.item(i);
      selfref._handleTouchMove(tc.identifier, tc.clientX, tc.clientY);
    }
  });
  
  this._canvas.addEventListener('touchend', function(ev) {
    var i, tc;
    
    // Indicate we are handling this event
    ev.preventDefault();
    
    // Run each changed touch through the handler
    for(i = 0; i < ev.changedTouches.length; i++) {
      tc = ev.changedTouches.item(i);
      selfref._handleTouchUp(tc.identifier, tc.clientX, tc.clientY);
    }
  });
  
  this._canvas.addEventListener('touchcancel', function(ev) {
    var i, tc;
    
    // Indicate we are handling this event
    ev.preventDefault();
    
    // Run each changed touch through the handler
    for(i = 0; i < ev.changedTouches.length; i++) {
      tc = ev.changedTouches.item(i);
      selfref._handleTouchUp(tc.identifier, tc.clientX, tc.clientY);
    }
  });
  
  // Register mouse event handlers and simulate them as if they were
  // touch events
  this._canvas.addEventListener('pointerdown', function(ev) {
    // Ignore if not primary pointer
    if (!ev.isPrimary) {
      return;
    }
    
    // Ignore if not for a mouse
    if (ev.pointerType !== "mouse") {
      return;
    }
    
    // Indicate we are handling this event
    ev.preventDefault();
    
    // Capture mouse
    selfref._canvas.setPointerCapture(ev.pointerId);
    
    // Call through to touch handler with simulated structure
    selfref._handleTouchDown("mouse", ev.clientX, ev.clientY);
  });
  
  this._canvas.addEventListener('pointermove', function(ev) {
    // Ignore if not primary pointer
    if (!ev.isPrimary) {
      return;
    }
    
    // Ignore if not for a mouse
    if (ev.pointerType !== "mouse") {
      return;
    }
    
    // Indicate we are handling this event
    ev.preventDefault();
    
    // Call through to touch handler with simulated structure
    selfref._handleTouchMove("mouse", ev.clientX, ev.clientY);
  });
  
  this._canvas.addEventListener('pointerup', function(ev) {
    // Ignore if not primary pointer
    if (!ev.isPrimary) {
      return;
    }
    
    // Ignore if not for a mouse
    if (ev.pointerType !== "mouse") {
      return;
    }
    
    // Indicate we are handling this event
    ev.preventDefault();
    
    // Release mouse
    selfref._canvas.releasePointerCapture(ev.pointerId);
    
    // Call through to touch handler with simulated structure
    selfref._handleTouchUp("mouse", ev.clientX, ev.clientY);
  });
  
  // Register mouse wheel event for scroll wheel operation
  this._canvas.addEventListener('wheel', function(ev) {
    // Indicate we are handling this event
    ev.preventDefault();
    
    // Call through to scroll handler
    selfref._handleScroll(ev);
  });
}

/*
 * Private instance functions
 * --------------------------
 */

/*
 * Given client X and Y coordinates, return an array with the X and Y
 * coordinates mapped to canvas coordinate space.
 * 
 * Parameters:
 * 
 *   cx : number - the client X coordinate
 * 
 *   cy : number - the client Y coordinate
 * 
 * Return:
 * 
 *   an array of two numbers, the first being the X coordinate in canvas
 *   space and the second being the Y coordinate in canvas space
 */
PicViewInputDriver.prototype._mapPointerToCanvas = function(cx, cy) {
  var r;
  
  // Check parameters
  if ((typeof(cx) !== "number") || (typeof(cy) !== "number")) {
    throw new TypeError();
  }
  
  // Get bounding rect of canvas in client space
  r = this._canvas.getBoundingClientRect();
  
  // Return client coordinates adjusted to canvas space
  return [
    cx - r.x,
    cy - r.y
  ];
};

/*
 * If there is a secondary touch active, close it.
 * 
 * This will raise the _fsingle handler if defined and appropriate.
 */
PicViewInputDriver.prototype._closeSecondary = function() {
  if (this._active[1] !== undefined) {
    if (this._fsingle) {
      this._fsingle();
    }
    this._active[1] = undefined;
  }
};

/*
 * If there is a primary touch active, close it.
 * 
 * This will call the _closeSecondary function first.
 * 
 * This will raise the _fend handler if defined and appropriate.  It
 * will also reset state and cancel any hold timeout in progress.
 */
PicViewInputDriver.prototype._closePrimary = function() {
  // Close out secondary first if open
  this._closeSecondary();
  
  // Close out primary if open
  if (this._active[0] !== undefined) {
    // Raise end handler if defined
    if (this._fend) {
      this._fend();
    }
    
    // Cancel any timeout in progress
    if (this._htime !== undefined) {
      clearTimeout(this._htime);
      this._htime = undefined;
    }
    
    // Reset state
    this._active[0] = undefined;
    this._pcx = undefined;
    this._pcy = undefined;
    this._bcx = undefined;
    this._bcy = undefined;
    this._bmaxd = undefined;
    this._dbl = undefined;
  }
};

/*
 * Handle individual touch events that occur when a touch is first
 * placed down.
 * 
 * You may pass mouse events into here with the tid set to "mouse"
 * 
 * Parameters:
 * 
 *   tid : (anything) - the identifier of the touch object; use "mouse"
 *   if this is a simulated touch event generated by a mouse
 * 
 *   cx : number - the client X coordinate
 * 
 *   cy : number - the client Y coordinate
 */
PicViewInputDriver.prototype._handleTouchDown = function(tid, cx, cy) {
  
  var selfref;
  var primary, isOverlay, ca, a, b, d;
  
  // Get a self reference for callbacks
  selfref = this;
  
  // Check parameters
  if ((typeof(cx) !== "number") || (typeof(cy) !== "number")) {
    throw new TypeError();
  }
  
  // If this is a simulated touch event from a mouse, ignore it unless
  // the active array is empty or the active array has a single touch ID
  // equal to "mouse"
  if (tid === "mouse") {
    if ((this._active[1] !== undefined) ||
          ((this._active[0] !== undefined) &&
            (this._active[0] !== "mouse"))) {
      return;
    }
  }
  
  // We first of all want to figure out whether this counts as a primary
  // pointer down or a secondary pointer down, or whether we should just
  // ignore this event
  if (this._active[0] === undefined) {
    // Nothing is currently active, so treat this as primary
    primary = true;
  
  } else if (this._active[0] === tid) {
    // This touch matches the currently active primary touch, so treat
    // this as primary
    primary = true;
    
  } else if (this._active[1] === undefined) {
    // This touch doesn't match the currently active primary touch and
    // no secondary touch is defined, so treat this as secondary
    primary = false;
    
  } else if (this._active[1] === tid) {
    // This touch matches a currently active secondary touch, so treat
    // this as secondary
    primary = false;
    
  } else {
    // In all other cases, this is beyond a secondary touch, so ignore
    // it
    return;
  }
  // Map the coordinates of this touch into canvas space
  ca = this._mapPointerToCanvas(cx, cy);
  
  // Further handling depends on whether this a primary touch press or
  // a secondary touch press
  if (primary) {
    // Primary touch press -- close primary and secondary if open
    this._closePrimary();
    
    // We are now outside any active drag mode; check whether the mapped
    // coordinates fall within the defined overlay area
    isOverlay = false;
    if ((this._ovx !== 0) && (this._ovy !== 0)) {
      // Both X and Y overlays are defined; check first whether mapped
      // X coordinate is within X overlay
      if (this._ovx < 0) {
        // X overlay is from the right side
        if (ca[0] >= this._canvas.width + this._ovx) {
          isOverlay = true;
        }
        
      } else if (this._ovx > 0) {
        // X overlay is from the left side
        if (ca[0] <= this._ovx) {
          isOverlay = true;
        }
        
      } else {
        throw "Unexpected";
      }
      
      // If we got a match for the X overlay, then the result for the Y
      // overlay will determine whether we really have a match for the
      // intersection of the two areas
      if (isOverlay) {
        // Reset isOverlay so that the Y test will determine it
        isOverlay = false;
        
        // Check whether mapped Y coordinate is within Y overlay
        if (this._ovy < 0) {
          // Y overlay is from the bottom side
          if (ca[1] >= this._canvas.height + this._ovy) {
            isOverlay = true;
          }
          
        } else if (this._ovy > 0) {
          // Y overlay is from the top side
          if (ca[1] <= this._ovy) {
            isOverlay = true;
          }
          
        } else {
          throw "Unexpected";
        }
      }
      
    } else if (this._ovx !== 0) {
      // Only an X overlay is defined
      if (this._ovx < 0) {
        // X overlay is from the right side
        if (ca[0] >= this._canvas.width + this._ovx) {
          isOverlay = true;
        }
        
      } else if (this._ovx > 0) {
        // X overlay is from the left side
        if (ca[0] <= this._ovx) {
          isOverlay = true;
        }
        
      } else {
        throw "Unexpected";
      }
      
    } else if (this._ovy !== 0) {
      // Only a Y overlay is defined
      if (this._ovy < 0) {
        // Y overlay is from the bottom side
        if (ca[1] >= this._canvas.height + this._ovy) {
          isOverlay = true;
        }
        
      } else if (this._ovy > 0) {
        // Y overlay is from the left side
        if (ca[1] <= this._ovy) {
          isOverlay = true;
        }
        
      } else {
        throw "Unexpected";
      }
    }
    
    // If we just determined that this primary pointer touch occurs
    // within an overlay area, then just handle an overlay event and
    // proceed no further
    if (isOverlay) {
      if (this._fover) {
        this._fover(ca[0], ca[1]);
      }
      return;
    }
    
    // If we got here, then we have a primary touch press that is not
    // in an overlay, and we've already made sure that there is no
    // longer any active drag operation; begin by setting up the state
    // for a drag operation
    this._active[0] = tid;
    this._pcx = cx;
    this._pcy = cy;
    this._bcx = cx;
    this._bcy = cy;
    this._bmaxd = 0.0;
    this._dbl = false;
    
    // Set up a timeout that will invoke a hold if necessary
    this._htime = setTimeout(function() {
      
      // Ignore the timeout event if no handler callback or if the
      // timeout handle is no longer defined
      if ((!selfref._fhold) || (selfref._htime === undefined)) {
        return;
      }
      
      // Ignore the timeout if we ever went into double mode or if we
      // ever strayed further than the threshold
      if (selfref._dbl || (selfref._bmaxd > selfref._dthr)) {
        return;
      }
      
      // If we got here, invoke the hold function
      selfref._fhold();
      
    }, this._tthr);
    
    // Finally, handle the beginning of the drag if defined
    if (this._fbegin) {
      this._fbegin(ca[0], ca[1]);
    }
    
  } else {
    // Secondary touch press -- close any secondary touch
    this._closeSecondary();
    
    // Due to what we checked earlier and what we just did, we now know
    // that we are in a drag operation and there is no secondary pointer
    // active and that the current event's pointer does not match the
    // main pointer; set the dbl flag to indicate that this drag
    // operation has gone into double mode at some point and then store
    // this touch ID as the active secondary pointer
    this._dbl = true;
    this._active[1] = tid;
    
    // Compute the SQUARE of the distance from (pcx, pcy) to the current
    // position of the secondary pointer
    a = cx - this._pcx;
    b = cy - this._pcy;
    d = (a * a) + (b * b);
    
    // Signal that we are entering double mode if handler defined
    if (this._fdouble) {
      this._fdouble(d);
    }
  }
};

/*
 * Handle individual touch events that occur when a touch is moved.
 * 
 * You may pass mouse events into here with the tid set to "mouse"
 * 
 * Parameters:
 * 
 *   tid : (anything) - the identifier of the touch object; use "mouse"
 *   if this is a simulated touch event generated by a mouse
 * 
 *   cx : number - the client X coordinate
 * 
 *   cy : number - the client Y coordinate
 */
PicViewInputDriver.prototype._handleTouchMove = function(tid, cx, cy) {
  var ca, a, b, d;
  
  // Check parameters
  if ((typeof(cx) !== "number") || (typeof(cy) !== "number")) {
    throw new TypeError();
  }
  
  // If this is a "mouse" simulated touch and there is no active touch,
  // then record this as a hover event and no further processing
  if ((tid === "mouse") && (this._active[0] === undefined)) {
    if (this._fhover) {
      ca = this._mapPointerToCanvas(cx, cy);
      this._fhover(ca[0], ca[1]);
    }
  }
  
  // Check whether the identifier of the touch matches a currently
  // active primary touch, a currently active secondary touch, or
  // else ignore if it doesn't match either
  if (tid === this._active[0]) {
    // Touch matches the primary pointer, so first of all update the
    // pcx/pcy statistics
    this._pcx = cx;
    this._pcy = cy;
    
    // Next, compute the SQUARE of the distance between the current
    // position of the primary touch and its position when it was first
    // pressed down
    a = cx - this._bcx;
    b = cy - this._bcy;
    d = (a * a) + (b * b);
    
    // Update the bmaxd statistic
    if (!(this._bmaxd >= d)) {
      this._bmaxd = d;
    }
    
    // We have now updated internal state, so next step is to map the
    // current position into canvas coordinate space
    ca = this._mapPointerToCanvas(cx, cy);
    
    // Finally, handle the drag event if defined
    if (this._fdrag) {
      this._fdrag(ca[0], ca[1]);
    }
    
  } else if (tid === this._active[1]) {
    // Touch matches the secondary touch, so compute the SQUARE of the
    // distance between the current secondary pointer position and the
    // most recent primary pointer position
    a = cx - this._pcx;
    b = cy - this._pcy;
    d = (a * a) + (b * b);
    
    // Handle the zoom event if defined
    if (this._fzoom) {
      this._fzoom(d);
    }
  }
};

/*
 * Handle individual touch events that occur when a touch is released or
 * canceled.
 * 
 * You may pass mouse events into here with the tid set to "mouse"
 * 
 * Parameters:
 * 
 *   tid : (anything) - the identifier of the touch object; use "mouse"
 *   if this is a simulated touch event generated by a mouse
 * 
 *   cx : number - the client X coordinate
 * 
 *   cy : number - the client Y coordinate
 */
PicViewInputDriver.prototype._handleTouchUp = function(tid, cx, cy) {
  
  // Check parameters
  if ((typeof(cx) !== "number") || (typeof(cy) !== "number")) {
    throw new TypeError();
  }
  
  // First of all, we want to handle any motion information in the touch
  // object, so call through to the move handler first
  this._handleTouchMove(tid, cx, cy);
  
  // If the touch matches an active primary or secondary touch, release
  // it appropriately
  if (tid === this._active[0]) {
    // Touch being released is primary, so release the primary and
    // release the secondary if it is also active
    this._closePrimary();
    
  } else if (tc.identifier === this._ptr.active[1]) {
    // Touch being released is secondary, so just release secondary
    this._closeSecondary();
  }
};

/*
 * Handle a WheelEvent representing motion of the mouse scroll wheel.
 * 
 * Parameters:
 * 
 *   ev - the WheelEvent to handle
 */
PicViewInputDriver.prototype._handleScroll = function(ev) {
  
  var dv, dmax;
  
  // Get the delta with the largest absolute value
  dv = ev.deltaX;
  dmax = Math.abs(ev.deltaX);
  
  if (Math.abs(ev.deltaY) > dmax) {
    dv = ev.deltaY;
    dmax = Math.abs(ev.deltaY);
  }
  
  if (Math.abs(ev.deltaZ) > dmax) {
    dv = ev.deltaZ;
    dmax = Math.abs(ev.deltaZ);
  }
  
  // Adjust to pixel units if necessary
  if (ev.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    dv = dv * this._ppscroll_line;
  
  } else if (ev.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    dv = dv * this._ppscroll_page;
    
  } else if (ev.deltaMode !== WheelEvent.DOM_DELTA_PIXEL) {
    dv = dv * this._ppscroll_line;
  }
  
  // Handle scroll event
  if (this._fscroll) {
    this._fscroll(dv);
  }
};

/*
 * Public instance functions
 * -------------------------
 */

/*
 * Begin events occur at the start of a drag when the primary pointer
 * first goes down.
 * 
 * This event never occurs when there is already a drag operation begun.
 * 
 * The callback takes two parameters, which are the X and Y coordinates
 * in canvas coordinate space.
 * 
 * If a callback function is already registered for this event, it is
 * overwritten with the new value.  If null is passed, any current
 * callback is removed.
 * 
 * Parameters:
 * 
 *   f : function - the callback function to register
 */
PicViewInputDriver.prototype.handleBegin = function(f) {
  // If null passed, release
  if (f === null) {
    this._fbegin = undefined;
    return;
  }
  
  // Check parameter
  if (typeof(f) !== "function") {
    throw new TypeError();
  }
  
  // Set the function handler
  this._fbegin = f;
};

/*
 * End events occur at the end of a drag when the primary pointer is
 * lifted.
 * 
 * This event only occurs after a drag operation begun.  This event
 * never occurs when a drag event is in double mode.
 * 
 * The callback takes no parameters.
 * 
 * If a callback function is already registered for this event, it is
 * overwritten with the new value.  If null is passed, any current
 * callback is removed.
 * 
 * Parameters:
 * 
 *   f : function - the callback function to register
 */
PicViewInputDriver.prototype.handleEnd = function(f) {
  // If null passed, release
  if (f === null) {
    this._fend = undefined;
    return;
  }
  
  // Check parameter
  if (typeof(f) !== "function") {
    throw new TypeError();
  }
  
  // Set the function handler
  this._fend = f;
};

/*
 * Double events occur during a drag operation when the secondary
 * pointer is first placed down.
 * 
 * This event only occurs after a drag operation begun.  This event
 * never occurs when already in double mode.
 * 
 * The callback takes one parameter, which is the SQUARE of the distance
 * of the secondary pointer from the primary pointer.
 * 
 * If a callback function is already registered for this event, it is
 * overwritten with the new value.  If null is passed, any current
 * callback is removed.
 * 
 * Parameters:
 * 
 *   f : function - the callback function to register
 */
PicViewInputDriver.prototype.handleDouble = function(f) {
  // If null passed, release
  if (f === null) {
    this._fdouble = undefined;
    return;
  }
  
  // Check parameter
  if (typeof(f) !== "function") {
    throw new TypeError();
  }
  
  // Set the function handler
  this._fdouble = f;
};

/*
 * Single events occur during a drag operation when the secondary
 * pointer is lifted.
 * 
 * This event only occurs after a drag operation begun and only when
 * that drag operation is in double mode.
 * 
 * The callback takes no parameters.
 * 
 * If a callback function is already registered for this event, it is
 * overwritten with the new value.  If null is passed, any current
 * callback is removed.
 * 
 * Parameters:
 * 
 *   f : function - the callback function to register
 */
PicViewInputDriver.prototype.handleSingle = function(f) {
  // If null passed, release
  if (f === null) {
    this._fsingle = undefined;
    return;
  }
  
  // Check parameter
  if (typeof(f) !== "function") {
    throw new TypeError();
  }
  
  // Set the function handler
  this._fsingle = f;
};

/*
 * Handle primary pointer motion during a drag event.
 * 
 * This event only occurs after a begin event and before an end event.
 * 
 * The callback takes two parameters, which are the X and Y coordinates
 * in canvas coordinate space.
 * 
 * If a callback function is already registered for this event, it is
 * overwritten with the new value.  If null is passed, any current
 * callback is removed.
 * 
 * Parameters:
 * 
 *   f : function - the callback function to register
 */
PicViewInputDriver.prototype.handleDrag = function(f) {
  // If null passed, release
  if (f === null) {
    this._fdrag = undefined;
    return;
  }
  
  // Check parameter
  if (typeof(f) !== "function") {
    throw new TypeError();
  }
  
  // Set the function handler
  this._fdrag = f;
};

/*
 * Handle zoom gestures with double pointers.
 * 
 * This event only occurs after a begin event and before an end event,
 * and only while that drag operation is in double mode.
 * 
 * The callback takes one parameter, which is the SQUARE of the distance
 * of the secondary pointer from the primary pointer.
 * 
 * If a callback function is already registered for this event, it is
 * overwritten with the new value.  If null is passed, any current
 * callback is removed.
 * 
 * Parameters:
 * 
 *   f : function - the callback function to register
 */
PicViewInputDriver.prototype.handleZoom = function(f) {
  // If null passed, release
  if (f === null) {
    this._fzoom = undefined;
    return;
  }
  
  // Check parameter
  if (typeof(f) !== "function") {
    throw new TypeError();
  }
  
  // Set the function handler
  this._fzoom = f;
};

/*
 * Handle pointer holds.
 * 
 * A pointer hold occurs after a timeout when a drag operation has gone
 * on for a certain period of time AND the total distance traveled by
 * the primary pointer is below a certain threshold AND the drag
 * operation never entered double mode.
 * 
 * This event only occurs between begin and end events.
 * 
 * The callback takes no parameters.
 * 
 * If a callback function is already registered for this event, it is
 * overwritten with the new value.  If null is passed, any current
 * callback is removed.
 * 
 * Parameters:
 * 
 *   f : function - the callback function to register
 */
PicViewInputDriver.prototype.handleHold = function(f) {
  // If null passed, release
  if (f === null) {
    this._fhold = undefined;
    return;
  }
  
  // Check parameter
  if (typeof(f) !== "function") {
    throw new TypeError();
  }
  
  // Set the function handler
  this._fhold = f;
};

/*
 * Overlay events occur when the primary pointer goes down in an area of
 * the canvas that has been designated as the overlay area.
 * 
 * Initially, the overlay area is empty so this event will never be
 * generated.  This event only works if an overlay area gets defined.
 * 
 * When the pointer goes down on the overlay, it does NOT cause a drag
 * operation to start.
 * 
 * This event never occurs between begin and end events.
 * 
 * The callback takes two parameters, which are the X and Y coordinates
 * in canvas coordinate space.
 * 
 * If a callback function is already registered for this event, it is
 * overwritten with the new value.  If null is passed, any current
 * callback is removed.
 * 
 * Parameters:
 * 
 *   f : function - the callback function to register
 */
PicViewInputDriver.prototype.handleOver = function(f) {
  // If null passed, release
  if (f === null) {
    this._fover = undefined;
    return;
  }
  
  // Check parameter
  if (typeof(f) !== "function") {
    throw new TypeError();
  }
  
  // Set the function handler
  this._fover = f;
};

/*
 * Hover events are mouse motion events that occur when there is no
 * active gesture.
 * 
 * This event never occurs between begin and end events, and it is only
 * generated when using a mouse.
 * 
 * The callback takes two parameters, which are the X and Y coordinates
 * in canvas coordinate space.
 * 
 * If a callback function is already registered for this event, it is
 * overwritten with the new value.  If null is passed, any current
 * callback is removed.
 * 
 * Parameters:
 * 
 *   f : function - the callback function to register
 */
PicViewInputDriver.prototype.handleHover = function(f) {
  // If null passed, release
  if (f === null) {
    this._fhover = undefined;
    return;
  }
  
  // Check parameter
  if (typeof(f) !== "function") {
    throw new TypeError();
  }
  
  // Set the function handler
  this._fhover = f;
};

/*
 * Scroll events are mouse wheel events.
 * 
 * This event may occur at any time, but it is only generated when using
 * a mouse or a device with a scroll wheel.
 * 
 * The callback takes one parameter, s, which is a positive or negative
 * integer that indicates the scrolling pixels that have passed.
 * 
 * If a callback function is already registered for this event, it is
 * overwritten with the new value.  If null is passed, any current
 * callback is removed.
 * 
 * Parameters:
 * 
 *   f : function - the callback function to register
 */
PicViewInputDriver.prototype.handleScroll = function(f) {
  // If null passed, release
  if (f === null) {
    this._fscroll = undefined;
    return;
  }
  
  // Check parameter
  if (typeof(f) !== "function") {
    throw new TypeError();
  }
  
  // Set the function handler
  this._fscroll = f;
};

/*
 * PicView class
 * =============
 */

/*
 * Constructor.
 * 
 * Invoke with "new".
 * 
 * Pass an HTMLCanvasElement that this object will manage.  Once a
 * PicView instance is attached to a specific HTMLCanvasElement, nothing
 * except that PicView instance must touch the canvas element or
 * undefined behavior occurs -- except as otherwise indicated in the
 * documentation of this constructor.
 * 
 * Also specify the background RGB color as a string of exactly six
 * base-16 digits in RRGGBB order, like "0000aa" for dark blue, for
 * example.  You can change this later, but the constructor already
 * needs to know it so it can blank the canvas.
 * 
 * The canvas starts out blanked to the given background color with no
 * image displayed.
 * 
 * The constructor will also register a resize observer on the canvas,
 * so that it will automatically get repainted if its size changes.
 * This means that you may use JavaScript to change the width and height
 * of the <canvas> element, even after connecting it to PicView, and
 * PicView will correctly detect those size changes and respond to them.
 * However, you should check the fullScreenMode() function and NOT
 * change width and height while that function is true, as this
 * component will handle size changes while in fullscreen mode.
 * 
 * Parameters:
 * 
 *   ce : HTMLCanvasElement - the <canvas> that this object will manage
 * 
 *   bgcolor : string - string of exactly six base-16 digits that
 *   specifies the RGB color to use as the blank background color
 */
function PicView(ce, bgcolor) {
  var selfref, ro;
  
  // Store a self-reference for use in callbacks
  selfref = this;
  
  // Check parameters
  if (!(ce instanceof HTMLCanvasElement)) {
    throw new TypeError();
  }
  if (typeof(bgcolor) !== "string") {
    throw new TypeError();
  }
  if (!((/^[0-9a-fA-F]{6}$/).test(bgcolor))) {
    throw "Invalid color string!";
  }
  
  // Store the background color in _bgcolor
  //
  this._bgcolor = bgcolor.toLowerCase();
  
  // Store the canvas element in _canvas
  //
  this._canvas = ce;
  
  // The _ptr property stores the low-level pointer driver, which
  // converts the pointerdown, pointermove, and pointerup events
  // received from the browser into higher-level events
  //
  this._ptr = new PicViewInputDriver(this._canvas);
  
  this._ptr.handleBegin(function(cx, cy) {
    selfref._inputBegin(cx, cy);
  });
  
  this._ptr.handleEnd(function() {
    selfref._inputEnd();
  });
  
  this._ptr.handleDouble(function(d) {
    selfref._inputDouble(d);
  });
  
  this._ptr.handleSingle(function() {
    selfref._inputSingle();
  });
  
  this._ptr.handleDrag(function(cx, cy) {
    selfref._inputDrag(cx, cy);
  });
  
  this._ptr.handleZoom(function(d) {
    selfref._inputZoom(d);
  });
  
  this._ptr.handleHold(function() {
    selfref._inputHold();
  });
  
  this._ptr.handleOver(function(cx, cy) {
    selfref._inputOverlay(cx, cy);
  });
  
  this._ptr.handleHover(function(cx, cy) {
    selfref._inputHover(cx, cy);
  });
  
  this._ptr.handleScroll(function(s) {
    selfref._inputScroll(s);
  });
  
  // Get a 2D drawing context and store it in _ctx; for efficiency, we
  // will tell the browser that the canvas doesn't need an alpha channel
  // and that we don't plan to read the canvas frequently
  //
  this._ctx = this._canvas.getContext('2d', {
    "alpha": false,
    "willReadFrequently": false
  });
  if (!(this._ctx)) {
    throw "Failed to get 2D drawing context!";
  }
  
  // Blank the canvas to the background color
  //
  this._ctx.fillStyle = "#" + this._bgcolor;
  this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);
  
  // The _requested flag is true if a paint request has been queued in
  // the event loop but not run yet
  //
  this._requested = false;
  
  // When _requested is set, _requested_fast indicates whether the
  // invoked paint request will use fast-preview mode
  //
  this._requested_fast = false;
  
  // The maximum enlargement by zoom.
  // 
  // Must be 1.0 or greater.
  // 
  // If set to 1.0, maximum enlargement is 100% with one display pixel
  // equaling one image pixel.  If set to 2.0, maximum enlargement is
  // 200% with one display pixel equality half an image pixel, and so
  // forth.
  //
  // @@TODO:
  this._max_enlarge = 4.0;
  
  // Scaling value for one positive scrolling increment
  //
  // @@TODO:
  this._scroll_scale = (1 / 53.0) * 1.5;
  
  // The _view object is a PicViewMap that stores the current view, or
  // is undefined if there is no image loaded
  //
  this._view = undefined;
  
  // The _fullv object is a PicViewMap that stores the fully zoomed-out
  // view of the currently loaded image for the current canvas size, or
  // is undefined if there is no image loaded
  //
  this._fullv = undefined;
  
  // The _dragstate keeps track of the basic user interface state
  // necessary for handling drag events; it has the following
  // properties:
  //
  //   startx, starty - the X, Y coordinates in canvas space at the
  //   start of the drag, or undefined if not in a drag
  //
  //   curx, cury - the most recently recorded X, Y, coordinates in
  //   canvas space during a drag, or undefined if not in a drag
  //
  //   curd - the most recently recorded distance of secondary pointer
  //   to primary pointer, or undefined if not in a double-mode drag
  //   operation
  //
  //   action - only defined if in a drag that is in full mode; in this
  //   case, it is a boolean flag indicating whether or not an action
  //   event has been triggered
  //
  //   action_fence - the SQUARE of the distance the primary touch must
  //   travel in full mode for an action to be activated
  //
  //   zoom_fence - when image is fully zoomed out, the primary touch
  //   must stay within this SQUARE of the distance from the position
  //   when first touched down in order for a zoom operation to actually
  //   start when double mode is entered
  //
  this._dragstate = {
    "startx": undefined,
    "starty": undefined,
    "curx": undefined,
    "cury": undefined,
    "curd": undefined,
    "action": undefined,
    
    "action_fence": (200*200),
    "zoom_fence": (50*50)
  };
  
  // Create a new PicViewImage that will handle loading image bitmaps
  // and register our ready function
  //
  this._img = new PicViewImage();
  this._img.handleReady(function() {
    selfref._handleImageLoad();
  });
  
  // Register a resize observer on the canvas so that we can detect
  // size changes
  //
  ro = new ResizeObserver(function(entries, observer) {
    // The paint handler will detect and respond to actual resizes of
    // the canvas
    selfref._handlePaint(false);
  });
  ro.observe(this._canvas);
  
  // The _swipe handler starts out undefined; see defineSwipe() for
  // details
  //
  this._swipe = undefined;
  
  // The current state of full screen; one of the following values:
  //
  //   out - not in full screen
  //   enter - entering full screen
  //   full - full screen
  //   leave - leaving full screen
  //
  this._fullscreen = "out";
  
  // _priorw and _priorh store the width and height of the canvas prior
  // to going fullscreen; these are used to restore the dimensions once
  // leaving fullscreen
  //
  this._priorw = undefined;
  this._priorh = undefined;
  
  // Add a listener for screen orientation changes; if we are in
  // fullscreen, then we will respond to orientation changes by resizing
  // the canvas element to match the screen again
  window.screen.orientation.onchange = function(ev) {
    if (selfref._fullscreen === "full") {
      selfref._canvas.width  = window.screen.width;
      selfref._canvas.height = window.screen.height;
    }
  };
}

/*
 * Static functions and data
 * -------------------------
 */

/*
 * PicView._FULLSCREEN_ALIAS stores a mapping of standard fullscreen API
 * names to arrays that begin with the standard name and then have any
 * vendor prefix names.
 */
PicView._FULLSCREEN_ALIAS = {
  "fullscreenEnabled": [
    "fullscreenEnabled",
    "webkitFullscreenEnabled",
    "mozFullScreenEnabled",
    "msFullscreenEnabled"
  ],
  "fullscreenElement": [
    "fullscreenElement",
    "webkitFullscreenElement",
    "mozFullScreenElement",
    "msFullscreenElement"
  ],
  "exitFullscreen": [
    "exitFullscreen",
    "webkitExitFullscreen",
    "mozCancelFullScreen",
    "msExitFullscreen"
  ],
  "requestFullscreen": [
    "requestFullscreen",
    "webkitRequestFullscreen",
    "mozRequestFullScreen",
    "msRequestFullscreen"
  ]
};

/*
 * Read the document.fullscreenEnabled property and return its boolean
 * value, using vendor-specific prefixes if necessary.
 * 
 * If no suitable API function is found, this returns false, simulating
 * a response of full screen not available.
 */
PicView._fullscreenEnabled = function() {
  var i, fa;
  
  // Look for an API function
  fa = PicView._FULLSCREEN_ALIAS.fullscreenEnabled;
  for(i = 0; i < fa.length; i++) {
    if (fa[i] in document) {
      return document[fa[i]];
    }
  }
  
  // If we got here, no API function so just return false
  return false;
};

/*
 * Read the document.fullscreenElement property and return the Element
 * or null if nothing fullscreen, using vendor-specific prefixes if
 * necessary.
 * 
 * If no suitable API function is found, this returns null, simulating a
 * response of nothing is fullscreen.
 */
PicView._fullscreenElement = function() {
  var i, fa;
  
  // Look for an API function
  fa = PicView._FULLSCREEN_ALIAS.fullscreenElement;
  for(i = 0; i < fa.length; i++) {
    if (fa[i] in document) {
      return document[fa[i]];
    }
  }
  
  // If we got here, no API function so just return null
  return null;
};

/*
 * Call document.exitFullscreen() and return the Promise for exiting the
 * full screen state, using vendor-specific prefixes if necessary.
 * 
 * If no suitable API function is found, this returns a rejected
 * Promise, simulating a response of encountering an error while leaving
 * fullscreen.
 */
PicView._exitFullscreen = function() {
  var i, fa;
  
  // Look for an API function
  fa = PicView._FULLSCREEN_ALIAS.exitFullscreen;
  for(i = 0; i < fa.length; i++) {
    if (fa[i] in document) {
      return document[fa[i]]();
    }
  }
  
  // If we got here, no API function so just return rejected promise
  return Promise.reject("Fullscreen API not available");
};

/*
 * Call requestFullscreen() on the given element and return the Promise
 * for entering the full screen state, using vendor-specific prefixes if
 * necessary.
 * 
 * options is the options parameter that should be passed, or undefined
 * if no options parameter should be passed.
 * 
 * If no suitable API function is found, this returns a rejected
 * Promise, simulating a response of encountering an error while leaving
 * fullscreen.
 */
PicView._requestFullscreen = function(e, options) {
  var i, fa;
  
  // Check that we got some kind of object
  if (typeof(e) !== "object") {
    throw new TypeError();
  }
  
  // Look for an API function
  fa = PicView._FULLSCREEN_ALIAS.requestFullscreen;
  for(i = 0; i < fa.length; i++) {
    if (fa[i] in e) {
      if (options !== undefined) {
        return e[fa[i]](options);
      } else {
        return e[fa[i]]();
      }
    }
  }
  
  // If we got here, no API function so just return rejected promise
  return Promise.reject("Fullscreen API not available");
};

/*
 * Private instance functions
 * --------------------------
 */

/*
 * Handler called when user requests that the picture viewer go full
 * screen.
 * 
 * Might be called in any full screen state.
 */
PicView.prototype._requestEnterFull = function() {
  var selfref;
  var obj, p;
  
  // Self reference for callbacks
  selfref = this;
  
  // Only respond to the request when in "out" state
  if (this._fullscreen !== "out") {
    return;
  }
  
  // Ignore if fullscreen not available
  if (!PicView._fullscreenEnabled()) {
    return;
  }
  
  // If something else is currently full screen, then ignore request
  if (PicView._fullscreenElement() !== null) {
    return;
  }
  
  // If we got here, then set fullscreen state to "enter", store the
  // current dimensions, and get a promise for entering fullscreen with
  // our canvas element
  this._fullscreen = "enter";
  this._priorw = this._canvas.width;
  this._priorh = this._canvas.height;
  p = PicView._requestFullscreen(this._canvas, {
    "navigationUI": "hide"
  });
  
  // Update the state when the operation completes and also handle some
  // resizing details if successful
  p.then(function(value) {
    // We entered fullscreen
    selfref._fullscreen = "full";
    
    // Set width and height of the canvas to screen dimensions
    selfref._canvas.width  = window.screen.width;
    selfref._canvas.height = window.screen.height;
    
  }, function(reason) {
    // Failed to enter fullscreen
    selfref._fullscreen = "out";
  });
};

/*
 * Handler called when user requests that the picture view leave full
 * screen.
 * 
 * Might be called in any full screen state.
 */
PicView.prototype._requestExitFull = function() {
  var selfref;
  var p;
  
  // Get self reference for callbacks
  selfref = this;
  
  // Only respond to the request when in "full" state
  if (this._fullscreen !== "full") {
    return;
  }
  
  // Set fullscreen state to "leave" and get a promise for leaving
  // fullscreen
  this._fullscreen = "leave";
  p = PicView._exitFullscreen();
  
  // Update the state when the operation completes, and also restore the
  // prior dimensions if successful
  p.then(function(value) {
    // Successfully left fullscreen
    selfref._canvas.width  = selfref._priorw;
    selfref._canvas.height = selfref._priorh;
    selfref._fullscreen = "out";
    
  }, function(reason) {
    // Failed to leave fullscreen
    selfref._fullscreen = "full";
  });
};

/*
 * Function invoked whenever we want to repaint the canvas for any
 * reason.
 * 
 * This function does NOT however handle the initial blanking of the
 * canvas that is done right away in the constructor.
 * 
 * If the canvas size stored in _view no longer matches the current
 * canvas size, this function assumes that the canvas has been resized
 * and it resets _fullv and _view to proper initial state for the new
 * canvas dimensions.
 * 
 * Parameters:
 * 
 *   fast : boolean - true to use fast-preview for drawing image, false
 *   for full quality
 */
PicView.prototype._handlePaint = function(fast) {
  
  // Check parameter
  if (typeof(fast) !== "boolean") {
    throw new TypeError();
  }
  
  // Blank the canvas to the background color
  this._ctx.fillStyle = "#" + this._bgcolor;
  this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);
  
  // If we don't have an image ready, don't proceed further
  if (!this._img.ready()) {
    return;
  }
  
  // If the canvas and full image dimensions don't match those in the
  // stored view, we need to reset views for new sizes
  if (!(this._view.check(
                this._canvas.width,
                this._canvas.height,
                this._img.getWidth(),
                this._img.getHeight()))) {
    this._fullv = new PicViewMap(
                        this._canvas.width,
                        this._canvas.height,
                        this._img.getWidth(),
                        this._img.getHeight());
    this._view = this._fullv.makeCopy();
  }
  
  // If in fast mode, disable smoothing for image rendering
  if (fast) {
    this._ctx.imageSmoothingEnabled = false;
  }
  
  // Draw the image according to the current view
  this._ctx.drawImage(
          this._img.getBitmap(fast),
          this._view.getDX(),
          this._view.getDY(),
          this._view.getDW(),
          this._view.getDH());
  
  // If in fast mode, restore image smoothing now that image drawn
  if (fast) {
    this._ctx.imageSmoothingEnabled = true;
  }
};

/*
 * Function invoked whenever the asynchronous loading of the internal
 * PicViewImage is complete.
 */
PicView.prototype._handleImageLoad = function() {
  // Compute the full view of the image into _fullv property and make
  // the initial view a copy of this full view
  this._fullv = new PicViewMap(
                      this._canvas.width,
                      this._canvas.height,
                      this._img.getWidth(),
                      this._img.getHeight());
  this._view = this._fullv.makeCopy();
  
  // Repaint
  this._handlePaint(false);
};

/*
 * Hover events are primary pointer motion events that occur when there
 * is no active gesture.
 * 
 * This event never occurs between begin and end events.
 * 
 * Parameters:
 * 
 *   x : number - the X coordinate in canvas coordinate space
 * 
 *   y : number - the Y coordinate in canvas coordinate space
 */
PicView.prototype._inputHover = function(x, y) {
  // @@TODO:
  // demo.logMessage("hover " + x + " " + y);
};

/*
 * Overlay events occur when the primary pointer goes down in an area of
 * the canvas that has been designated as the overlay area.
 * 
 * Initially, the overlay area is empty so this event will never be
 * generated.  This event only works if an overlay area gets defined.
 * 
 * When the pointer goes down on the overlay, it does NOT cause a drag
 * operation to start.
 * 
 * This event never occurs between begin and end events.
 * 
 * Parameters:
 * 
 *   x : number - the X coordinate in canvas coordinate space
 * 
 *   y : number - the Y coordinate in canvas coordinate space
 */
PicView.prototype._inputOverlay = function(x, y) {
  // @@TODO:
  demo.logMessage("overlay " + x + " " + y);
};

/*
 * Begin events occur at the start of a drag when the primary pointer
 * first goes down.
 * 
 * This event never occurs when there is already a drag operation begun.
 * 
 * Parameters:
 * 
 *   x : number - the X coordinate in canvas coordinate space
 * 
 *   y : number - the Y coordinate in canvas coordinate space
 */
PicView.prototype._inputBegin = function(x, y) {
  // Ignore if no image loaded
  if (this._view === undefined) {
    return;
  }
  
  // Update drag state statistics
  this._dragstate.startx = x;
  this._dragstate.starty = y;
  this._dragstate.curx = x;
  this._dragstate.cury = y;
  this._dragstate.curd = undefined;
  
  // If we are in full view, set action flag to false, otherwise set it
  // to undefined
  if (this._view.equalTo(this._fullv)) {
    this._dragstate.action = false;
  } else {
    this._dragstate.action = undefined;
  }
};

/*
 * End events occur at the end of a drag when the primary pointer is
 * lifted.
 * 
 * This event only occurs after a drag operation begun.  This event
 * never occurs when a drag event is in double mode.
 */
PicView.prototype._inputEnd = function() {
  
  var selfref;
  
  // Self reference for callbacks
  selfref = this;
  
  // Ignore if no image loaded
  if (this._view === undefined) {
    return;
  }
  
  // Update drag state statistics
  this._dragstate.startx = undefined;
  this._dragstate.starty = undefined;
  this._dragstate.curx = undefined;
  this._dragstate.cury = undefined;
  this._dragstate.curd = undefined;
  this._dragstate.action = undefined;
  
  // Low-quality image might be displayed now, so if there is a repaint
  // request pending, upgrade its quality to full, or else schedule a
  // repaint request on full quality
  if (this._requested) {
    this._requested_fast = false;
  }  else {
    this._requested = true;
    this._requested_fast = false;
    setTimeout(function() {
      // Clear the requested flag
      selfref._requested = false;
      
      // Invoke repaint
      selfref._handlePaint(selfref._requested_fast);
    }, 0);
  }
};

/*
 * Double events occur during a drag operation when the secondary
 * pointer is first placed down.
 * 
 * This event only occurs after a drag operation begun.  This event
 * never occurs when already in double mode.
 * 
 * Parameters:
 * 
 *   d : number - the SQUARE of the distance of the secondary pointer
 *   from the primary pointer
 */
PicView.prototype._inputDouble = function(d) {
  var a, b, d;
  
  // Ignore if no image loaded
  if (this._view === undefined) {
    return;
  }
  
  // Ignore if input state undefined
  if (this._dragstate.startx === undefined) {
    return;
  }
  
  // Special handling if currently in full mode
  if (this._dragstate.action !== undefined) {
    // If we have already hit an action, then ignore this event
    if (this._dragstate.action) {
      return;
    }
    
    // If we are outside the zoom fence, then ignore this event
    a = this._dragstate.curx - this._dragstate.startx;
    b = this._dragstate.cury - this._dragstate.starty;
    d = (a * a) + (b * b);
    if (d > this._dragstate.zoom_fence) {
      return;
    }
    
    // If we got here, then undefine the action flag so we are now in
    // zoom mode and continue on
    this._dragstate.action = undefined;
  }
  
  // If we got here, we are in zoom mode, so just update the current
  // distance
  this._dragstate.curd = d;
};

/*
 * Single events occur during a drag operation when the secondary
 * pointer is lifted.
 * 
 * This event only occurs after a drag operation begun and only when
 * that drag operation is in double mode.
 */
PicView.prototype._inputSingle = function() {
  // Ignore if no image loaded
  if (this._view === undefined) {
    return;
  }
  
  // Clear current distance statistic to undefined
  this._dragstate.curd = undefined;
};

/*
 * Handle primary pointer motion during a drag event.
 * 
 * This event only occurs after a begin event and before an end event.
 * 
 * Parameters:
 * 
 *   x : number - the X coordinate in canvas coordinate space
 * 
 *   y : number - the Y coordinate in canvas coordinate space
 */
PicView.prototype._inputDrag = function(x, y) {
  var selfref;
  var a, b, d, quad;
  
  // Self-reference for callbacks
  selfref = this;
  
  // Ignore if no image loaded
  if (this._view === undefined) {
    return;
  }
  
  // Ignore if input state undefined
  if (this._dragstate.startx === undefined) {
    return;
  }
  
  // Special handling if in full mode
  if (this._dragstate.action !== undefined) {
    // Begin by updating current position
    this._dragstate.curx = x;
    this._dragstate.cury = y;
    
    // If action flag was already set, then no further processing
    if (this._dragstate.action) {
      return;
    }
    
    // Compute square of distance from original touch-down
    a = this._dragstate.curx - this._dragstate.startx;
    b = this._dragstate.cury - this._dragstate.starty;
    d = (a * a) + (b * b);
    
    // If distance has exceeded the action fence, then handle an action
    if (d >= this._dragstate.action_fence) {
      // Set the action flag
      this._dragstate.action = true;
      
      // Determine the quadrant the action belongs to on an XY graph
      // that is rotated 45 degrees
      if (Math.abs(a) >= Math.abs(b)) {
        // X movement is more than Y movement, so either left or right
        if (a >= 0) {
          quad = "r";
        } else {
          quad = "l";
        }
        
      } else {
        // Y movement is more than X movement, so either up or down
        if (b >= 0) {
          quad = "d";
        } else {
          quad = "u";
        }
      }
      
      // Invoke appropriate handler
      if (quad === "l") {
        // Swipe left handler if defined
        if (this._fswipe) {
          this._fswipe(false);
        }
        
      } else if (quad === "r") {
        // Swipe right handler if defined
        if (this._fswipe) {
          this._fswipe(true);
        }
        
      } else if (quad === "u") {
        // Swipe up is a full screen request
        this._requestEnterFull();
        
      } else if (quad === "d") {
        // Swipe down is a exit full screen request
        this._requestExitFull();
        
      } else {
        throw "Unexpected";
      }
    }
    
    // We are now finished in this case
    return;
  }
  
  // If we got here, then perform a translate operation in the current
  // view and schedule a repaint if view actually changed AND no current
  // paint event scheduled
  if (this._view.translate(
              x, y, this._dragstate.curx, this._dragstate.cury)) {
    if (!this._requested) {
      // Set a call to a fast-preview repaint that will run sometime
      // later during event handling and set requested flag
      this._requested = true;
      this._requested_fast = true;
      setTimeout(function() {
        // Clear the requested flag
        selfref._requested = false;
        
        // Invoke repaint
        selfref._handlePaint(selfref._requested_fast);
      }, 0);
    }
  }
  
  // Update current coordinates
  this._dragstate.curx = x;
  this._dragstate.cury = y;
};

/*
 * Handle zoom gestures with double pointers.
 * 
 * This event only occurs after a begin event and before an end event,
 * and only while that drag operation is in double mode.
 * 
 * Parameters:
 * 
 *   d : number - the SQUARE of the distance of the secondary pointer
 *   from the primary pointer
 */
PicView.prototype._inputZoom = function(d) {
  var selfref;
  
  // Self-reference for callbacks
  selfref = this;
  
  // Ignore if no image loaded
  if (this._view === undefined) {
    return;
  }
  
  // Ignore if no current distance reading on drag state
  if (this._dragstate.curd === undefined) {
    return;
  }
  
  // Update view with zoom and schedule fast-preview repaint if no
  // repaint scheduled AND actual change in view state
  if (this._view.zoom(
          d, this._dragstate.curd, this._max_enlarge, this._fullv)) {
    if (!this._requested) {
      // Set a call to a fast-preview repaint that will run sometime
      // later during event handling and set requested flag
      this._requested = true;
      this._requested_fast = true;
      setTimeout(function() {
        // Clear the requested flag
        selfref._requested = false;
        
        // Invoke repaint
        selfref._handlePaint(selfref._requested_fast);
      }, 0);
    }
  }
  
  // Update current distance
  this._dragstate.curd = d;
};

/*
 * Handle pointer holds.
 * 
 * A pointer hold occurs after a drag operation when the entire drag
 * operation stayed in single mode AND the total distance traveled by
 * the primary pointer is below a certain threshold AND the total time
 * the pointer stayed down exceeds a certain threshold.
 * 
 * This event never occurs between begin and end events.
 */
PicView.prototype._inputHold = function() {
  // @@TODO:
  demo.logMessage("hold");
};

/*
 * Handle mouse wheel scrolling.
 */
PicView.prototype._inputScroll = function(s) {
  var selfref;
  var sv;
  
  // Self-reference for callbacks
  selfref = this;
  
  // Ignore if no image loaded
  if (this._view === undefined) {
    return;
  }
  
  // Get scaling value
  if (s < 0.0) {
    sv = Math.abs(s) * this._scroll_scale;
    
  } else if (s > 0.0) {
    sv = 1 / (s * this._scroll_scale);
    
  } else {
    return;
  }
  
  // Update view with zoom and schedule full repaint if no repaint
  // scheduled AND actual change in view state
  if (this._view.zoom(
          sv, 1.0, this._max_enlarge, this._fullv)) {
    if (!this._requested) {
      // Set a call to a full repaint that will run sometime later
      // during event handling and set requested flag
      this._requested = true;
      this._requested_fast = false;
      setTimeout(function() {
        // Clear the requested flag
        selfref._requested = false;
        
        // Invoke repaint
        selfref._handlePaint(selfref._requested_fast);
      }, 0);
    }
  }
};

/*
 * Public instance functions
 * -------------------------
 */

/*
 * Load a new image into the display canvas.
 * 
 * Images load asynchronously, so the canvas is not immediately updated
 * by this event.  This function will immediately blank the canvas, but
 * only draw the image when it actually finishes loading.  If the image
 * does not successfully load, the canvas will remain blank.
 * 
 * Parameters:
 * 
 *   src : string - the URL of the image to load
 */
PicView.prototype.loadImage = function(src) {
  
  // Check parameter
  if (typeof(src) !== "string") {
    throw new TypeError();
  }
  
  // Begin by unloading any current views
  this._view  = undefined;
  this._fullv = undefined;
  
  // Reset the drag state
  this._dragstate.startx = undefined;
  this._dragstate.starty = undefined;
  this._dragstate.curx = undefined;
  this._dragstate.cury = undefined;
  this._dragstate.curd = undefined;
  this._dragstate.action = undefined;
  
  // Repaint to blank the canvas
  this._handlePaint(false);
  
  // Asynchronously start the image loading process
  this._img.load(src);
};

/*
 * Force a repaint of the canvas.
 */
PicView.prototype.forcePaint = function() {
  this._handlePaint(false);
};

/*
 * Install a handler for swipe left or swipe right actions.
 * 
 * Swipe actions occur when fully zoomed out and the user swipes left or
 * swipes right.  The callback takes a single parameter which is set to
 * true for a swipe right, false for a swipe left.
 * 
 * Swipe up and swipe down are handled internally.
 * 
 * If a callback function is already registered for this event, it is
 * overwritten with the new value.  If null is passed, any current
 * callback is removed.
 * 
 * Parameters:
 * 
 *   f : function - the callback function to register
 */
PicView.prototype.handleSwipe = function(f) {
  // If null passed, release
  if (f === null) {
    this._fswipe = undefined;
    return;
  }
  
  // Check parameter
  if (typeof(f) !== "function") {
    throw new TypeError();
  }
  
  // Set the function handler
  this._fswipe = f;
};

/*
 * Check whether viewer is in some form of full screen operation.
 * 
 * Return:
 * 
 *   true if entering, leaving, or in fullscreen, false if out of
 *   fullscreen
 */
PicView.prototype.fullScreenMode = function() {
  if (this._fullscreen === "out") {
    return false;
  } else {
    return true;
  }
};
