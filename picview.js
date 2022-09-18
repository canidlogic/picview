"use strict";

/*
 * picview.js
 * ==========
 * 
 * Defines the PicView class.
 * 
 * This class is attached to a specific <canvas> element during
 * construction and then manages the element.
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
  this._bgcolor = bgcolor.toLowerCase();
  
  // Store the canvas element in _canvas
  this._canvas = ce;
  
  // The _ptr property stores the state of the low-level pointer driver,
  // which converts the pointerdown, pointermove, and pointerup events
  // received from the browser into higher-level events; it has the
  // following properties:
  //
  //   active - array of two elements; if both elements are undefined,
  //   then no pointer is down; if first element defined but second
  //   undefined then one pointer down and first element has its pointer
  //   ID; if both elements defined then two pointers down and first
  //   element is primary pointer ID and second element is secondary
  //   pointer ID
  //
  //   pcx, pcy - when active array has at least one defined element,
  //   these two properties store the last client position (NOT
  //   transformed into canvas space) that was read for the primary
  //   pointer; this is used for computing distance values for the
  //   secondary pointer
  //
  //   bcx, bcy - when active array has at least one defined element,
  //   these two properties store the client position (NOT transformed
  //   into canvas space) that was read when the primary pointer was
  //   last placed down; this is used to compute the maximum distance
  //   the pointer has traveled on the screen while it is down
  //
  //   bcxm, bcym - the same as bcx, bcy except mapped into the
  //   coordinate space of the canvas; used to report location of holds
  //
  //   btime - when active array has at least one defined element, this
  //   property stores the timeStamp property from the event that
  //   indicated the pointer was placed down; this is used to check how
  //   long the pointer has remained down
  //
  //   bmaxd - when active array has at least one defined element, this
  //   property is a running statistic that indicates the maximum SQUARE
  //   of the distance that the pointer has strayed from (bcx, bcy); the
  //   square is used to avoid a square root during the distance
  //   calculation
  //
  //   dbl - when active array has at least one defined element, this
  //   property is a boolean that is set if at any point during the drag
  //   operation there was a double event
  //
  //   dthr - the SQUARE of the maximum distance that the primary
  //   pointer may travel during a drag operation for the drag operation
  //   to still possibly count as a hold
  //
  //   tthr - the minimum number of milliseconds that the pointer must
  //   be down for the drag operation to possibly count as a hold
  //
  //   ovx, ovy - the X overlay and Y overlay distances; if these are
  //   both set to zero, then there is no overlay area; else, ovx values
  //   greater than zero define overlay area on left side and ovx values
  //   less than zero define overlay area on right side while ovy values
  //   greater than zero define overlay area on top and ovy values less
  //   than zero define overlay area on bottom; the actual width or
  //   height of the overlay area is the absolute value of ovx or ovy,
  //   and if both ovx and ovy are active then the overlay area is the
  //   INTERSECTION of the overlay areas that each of the parameters
  //   define; if the primary pointer goes down in the overlay area,
  //   then this is handled as an overlay click and does NOT cause the
  //   primary pointer to be registered in the active array
  //
  this._ptr = {
    "active": [undefined, undefined],
    "pcx": undefined,
    "pcy": undefined,
    "bcx": undefined,
    "bcy": undefined,
    "bcxm": undefined,
    "bcym": undefined,
    "btime": undefined,
    "bmaxd": undefined,
    "dbl": undefined,
    "dthr": 100,
    "tthr": 1000,
    "ovx": 0,
    "ovy": 0
  };
  
  // Register pointer event handlers
  this._canvas.addEventListener('pointerdown', function(ev) {
    selfref._handlePointerDown(ev);
  });
  
  this._canvas.addEventListener('pointermove', function(ev) {
    selfref._handlePointerMove(ev);
  });
  
  this._canvas.addEventListener('pointerup', function(ev) {
    selfref._handlePointerUp(ev);
  });
  
  // Get a 2D drawing context and store it in _ctx; for efficiency, we
  // will tell the browser that the canvas doesn't need an alpha channel
  // and that we don't plan to read the canvas frequently
  this._ctx = this._canvas.getContext('2d', {
    "alpha": false,
    "willReadFrequently": false
  });
  if (!(this._ctx)) {
    throw "Failed to get 2D drawing context!";
  }
  
  // Blank the canvas to the background color
  this._ctx.fillStyle = "#" + this._bgcolor;
  this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);
  
  // The _view object stores the current view, or is undefined if there
  // is no image loaded; when it is defined, it always has the following
  // properties:
  //
  //   canvas_width  - the width of canvas this view defined for
  //   canvas_height - the height of canvas this view defined for
  //   dx - the canvas X to blit to
  //   dy - the canvas Y to blit to
  //   dw - the width on the canvas of the blit
  //   dh - the height on the canvas of the blit
  //
  this._view = undefined;
  
  // The _fullv object stores the fully zoomed-out view of the currently
  // loaded image for the current canvas size, or is undefined if there
  // is no image loaded; when it is defined, it has the same format as
  // the _view property
  this._fullv = undefined;
  
  // Define the _ready flag, which is true if the _img element we are
  // about to define is ready to draw an image, false otherwise
  this._ready = false;
    
  // Create a new <img> element that will store the image we are viewing
  // and store this in _img
  this._img = new Image();
  
  // Images load asynchronously, so register a load event handler on the
  // <img> element that invokes our _handleImageLoad() function
  this._img.onload = function() {
    selfref._handleImageLoad();
  };
  
  // Register a resize observer on the canvas so that we can detect
  // size changes
  ro = new ResizeObserver(function(entries, observer) {
    // The paint handler will detect and respond to actual resizes of
    // the canvas
    selfref._handlePaint();
  });
  ro.observe(this._canvas);
}

/*
 * Private instance functions
 * ==========================
 */

/*
 * Given the width and height of an image, compute the _fullv property
 * of this object based on the current canvas dimensions so that it will
 * show the whole image in proper aspect, centered in the canvas.
 * 
 * Parameters:
 * 
 *   iw : number - the width of the image, must be greater than zero
 * 
 *   ih : number - the height of the image, must be greater than zero
 */
PicView.prototype._computeFullView = function(iw, ih) {
  
  var cw, ch;
  var sw, sh, sc;
  var scale;
  var rx, ry, rw, rh;
  
  // Check parameters
  if ((typeof(iw) !== "number") || (typeof(ih) !== "number")) {
    throw new TypeError();
  }
  if ((!isFinite(iw)) || (!isFinite(ih))) {
    throw "Image dimensions must be finite!";
  }
  if (!((iw > 0.0) && (ih >= 0.0))) {
    throw "Image dimensions must both be greater than zero!";
  }
  
  // Get the canvas width and height
  cw = this._canvas.width;
  ch = this._canvas.height;
  
  if ((typeof(cw) !== "number") || (typeof(ch) !== "number")) {
    throw new TypeError();
  }
  
  // If canvas width or height are less than two, set them to two
  if (cw < 2) {
    cw = 2;
  }
  if (ch < 2) {
    ch = 2;
  }
  
  // Determine how many times the width of the canvas the width of the
  // image is, and do the same for height
  sw = iw / cw;
  sh = ih / ch;
  
  // The composite scaling factor is the maximum of sw and sh, which
  // indicates the dimension of the image that will be more difficult to
  // fit in this canvas
  sc = sw;
  if (sh > sc) {
    sc = sh;
  }
  
  // If composite scaling factor does not exceed 1.0, then the image
  // fits within the canvas without any scaling, so set scale to 1.0 in
  // that case; otherwise, scale is the inverse of the composite scaling
  // factor
  if (sc <= 1.0) {
    scale = 1.0;
  } else {
    scale = 1.0 / sc;
  }
  
  // We now know the scaling we will apply to the image, so compute the
  // scaled width and height of the image
  rw = iw * scale;
  rh = ih * scale;
  
  // Compute the X and Y coordinates so as to center the image
  rx = (cw - rw) / 2.0;
  ry = (ch - rh) / 2.0;
  
  // Now define the view
  this._fullv = {
    "canvas_width":  this._canvas.width,
    "canvas_height": this._canvas.height,
    "dx":            rx,
    "dy":            ry,
    "dw":            rw,
    "dh":            rh
  };
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
 */
PicView.prototype._handlePaint = function() {
  
  // Blank the canvas to the background color
  this._ctx.fillStyle = "#" + this._bgcolor;
  this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);
  
  // If we don't have an image ready, don't proceed further
  if (!this._ready) {
    return;
  }
  
  // If the canvas dimensions don't match those in the stored view, we
  // need to reset views for new canvas size
  if (!((this._view.canvas_width  === this._canvas.width ) &&
        (this._view.canvas_height === this._canvas.height))) {
    this._computeFullView(
          this._img.naturalWidth,
          this._img.naturalHeight);
    this._view = {
      "canvas_width":  this._fullv.canvas_width,
      "canvas_height": this._fullv.canvas_height,
      "dx":            this._fullv.dx,
      "dy":            this._fullv.dy,
      "dw":            this._fullv.dw,
      "dh":            this._fullv.dh
    };
  }
  
  // Draw the image according to the current view
  this._ctx.drawImage(
          this._img,
          this._view.dx,
          this._view.dy,
          this._view.dw,
          this._view.dh);
};

/*
 * Function invoked whenever the asynchronous loading of the internal
 * <img> is complete.
 * 
 * If the complete flag of the image element is set AND both the
 * naturalWidth and naturalHeight attributes of the image element are
 * greater than zero, then this function will set the _ready flag, set
 * an initial view, and invoke our private _handlePaint function.
 */
PicView.prototype._handleImageLoad = function() {
  // Only proceed if picture successfully loaded
  if (this._img.complete &&
        (this._img.naturalWidth > 0) &&
        (this._img.naturalHeight > 0)) {
    
    // Compute the full view of the image into the _fullv property
    this._computeFullView(
            this._img.naturalWidth,
            this._img.naturalHeight);
    
    // Set initial view to a copy of the full view
    this._view = {
      "canvas_width":  this._fullv.canvas_width,
      "canvas_height": this._fullv.canvas_height,
      "dx":            this._fullv.dx,
      "dy":            this._fullv.dy,
      "dw":            this._fullv.dw,
      "dh":            this._fullv.dh
    };
    
    // Set ready flag and repaint
    this._ready = true;
    this._handlePaint();
  }
};

/*
 * Given a mouse event (which pointer events are a subclass of), return
 * an array with the X and Y coordinates of the event within the canvas
 * coordinate space.
 * 
 * Parameters:
 * 
 *   ev - the mouse (or pointer) event
 * 
 * Return:
 * 
 *   an array of two numbers, the first being the X coordinate in canvas
 *   space and the second being the Y coordinate in canvas space
 */
PicView.prototype._mapPointerToCanvas = function(ev) {
  var r;
  
  // Get bounding rect of canvas in client space
  r = this._canvas.getBoundingClientRect();
  
  // Return client coordinates adjusted to canvas space
  return [
    ev.clientX - r.x,
    ev.clientY - r.y
  ];
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
  demo.logMessage("hover " + x + " " + y);
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
  // @@TODO:
  demo.logMessage("begin " + x + " " + y);
};

/*
 * End events occur at the end of a drag when the primary pointer is
 * lifted.
 * 
 * This event only occurs after a drag operation begun.  This event
 * never occurs when a drag event is in double mode.
 */
PicView.prototype._inputEnd = function() {
  // @@TODO:
  demo.logMessage("end");
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
  // @@TODO:
  demo.logMessage("double " + d);
};

/*
 * Single events occur during a drag operation when the secondary
 * pointer is lifted.
 * 
 * This event only occurs after a drag operation begun and only when
 * that drag operation is in double mode.
 */
PicView.prototype._inputSingle = function() {
  // @@TODO:
  demo.logMessage("single");
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
  // @@TODO:
  demo.logMessage("drag " + x + " " + y);
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
  // @@TODO:
  demo.logMessage("zoom " + d);
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
 * 
 * Parameters:
 * 
 *   x : number - the X coordinate in canvas coordinate space
 * 
 *   y : number - the Y coordinate in canvas coordinate space
 */
PicView.prototype._inputHold = function(x, y) {
  // @@TODO:
  demo.logMessage("hold " + x + " " + y);
};

/*
 * Wrapper around _inputHold that only raises the _inputHold event if
 * the state indicates that a drag operation about to finish qualifies
 * as a hold.
 * 
 * Call this after _inputEnd but before clearing the _ptr state.
 * 
 * Parameters:
 * 
 *   x : number - the X coordinate in canvas coordinate space
 * 
 *   y : number - the Y coordinate in canvas coordinate space
 * 
 *   ts : number - the timestamp of the event that ended the drag
 *   operation
 */
PicView.prototype._raiseIfHold = function(x, y, ts) {
  // @@TODO:
  demo.logMessage("checkhold " + x + " " + y);
}

/*
 * Private instance function handler of pointer-down events on the
 * canvas.
 */
PicView.prototype._handlePointerDown = function(ev) {
  
  var primary, isOverlay, ca, a, b, d;
  
  // We first of all want to figure out whether this counts as a primary
  // pointer down or a secondary pointer down, or whether we should just
  // ignore this event
  if (ev.isPrimary) {
    // Event indicates this is a primary pointer, so always interpret it
    // that way
    primary = true;
    
  } else {
    // Event did not indicate that this is a primary pointer; if there
    // is no active pointer down, then ignore this event
    if (this._ptr.active[0] === undefined) {
      return;
    }
    
    // If we got here, there is a primary active pointer down; if the
    // ID of that primary active pointer equals the ID of the pointer
    // for this event, then this event is strange so ignore it
    if (this._ptr.active[0] === ev.pointerId) {
      return;
    }
    
    // If there is already a secondary pointer, check that it is equal
    // to this pointer ID, or else ignore this event
    if (this._ptr.active[1] !== undefined) {
      if (this._ptr.active[1] !== ev.pointerId) {
        return;
      }
    }
    
    // If we got here, then we know that there is a primary pointer
    // already down that is not equal to the pointer of this event, and
    // that if there is already a secondary pointer down, it has the
    // same pointer ID as this event; we know the pointer is secondary
    // in this case
    primary = false;
  }
  
  // If we got here, then we are going to handle this event so prevent
  // the default behavior
  ev.preventDefault();
  
  // Map the coordinates of this event into canvas space
  ca = this._mapPointerToCanvas(ev);
  
  // Further handling depends on whether this a primary pointer press or
  // a secondary pointer press
  if (primary) {
    // Primary pointer press -- if we are currently in a drag operation
    // that is in double mode, go back to single mode
    if (this._ptr.active[1] !== undefined) {
      this._inputSingle();
      this._canvas.releasePointerCapture(this._ptr.active[1]);
      this._ptr.active[1] = undefined;
    }
    
    // We are now definitely not in double mode; if we are currently in
    // a drag operation, finish that drag operation
    if (this._ptr.active[0] !== undefined) {
      this._inputEnd();
      this._raiseIfHold(this._ptr.bcxm, this._ptr.bcym, ev.timeStamp);
      this._canvas.releasePointerCapture(this._ptr.active[0]);
      this._ptr.active[0] = undefined;
      this._ptr.pcx = undefined;
      this._ptr.pcy = undefined;
      this._ptr.bcx = undefined;
      this._ptr.bcy = undefined;
      this._ptr.bcxm = undefined;
      this._ptr.bcym = undefined;
      this._ptr.btime = undefined;
      this._ptr.bmaxd = undefined;
      this._ptr.dbl = undefined;
    }
    
    // We are now outside any active drag mode; check whether the mapped
    // coordinates fall within the defined overlay area
    isOverlay = false;
    if ((this._ptr.ovx !== 0) && (this._ptr.ovy !== 0)) {
      // Both X and Y overlays are defined; check first whether mapped
      // X coordinate is within X overlay
      if (this._ptr.ovx < 0) {
        // X overlay is from the right side
        if (ca[0] >= this._canvas.width + this._ptr.ovx) {
          isOverlay = true;
        }
        
      } else if (this._ptr.ovx > 0) {
        // X overlay is from the left side
        if (ca[0] <= this._ptr.ovx) {
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
        if (this._ptr.ovy < 0) {
          // Y overlay is from the bottom side
          if (ca[1] >= this._canvas.height + this._ptr.ovy) {
            isOverlay = true;
          }
          
        } else if (this._ptr.ovy > 0) {
          // Y overlay is from the top side
          if (ca[1] <= this._ptr.ovy) {
            isOverlay = true;
          }
          
        } else {
          throw "Unexpected";
        }
      }
      
    } else if (this._ptr.ovx !== 0) {
      // Only an X overlay is defined
      if (this._ptr.ovx < 0) {
        // X overlay is from the right side
        if (ca[0] >= this._canvas.width + this._ptr.ovx) {
          isOverlay = true;
        }
        
      } else if (this._ptr.ovx > 0) {
        // X overlay is from the left side
        if (ca[0] <= this._ptr.ovx) {
          isOverlay = true;
        }
        
      } else {
        throw "Unexpected";
      }
      
    } else if (this._ptr.ovy !== 0) {
      // Only a Y overlay is defined
      if (this._ptr.ovy < 0) {
        // Y overlay is from the bottom side
        if (ca[1] >= this._canvas.height + this._ptr.ovy) {
          isOverlay = true;
        }
        
      } else if (this._ptr.ovy > 0) {
        // Y overlay is from the left side
        if (ca[1] <= this._ptr.ovy) {
          isOverlay = true;
        }
        
      } else {
        throw "Unexpected";
      }
    }
    
    // If we just determined that this primary pointer press occurs
    // within an overlay area, then just handle an overlay event and
    // proceed no further
    if (isOverlay) {
      this._inputOverlay(ca[0], ca[1]);
      return;
    }
    
    // If we got here, then we have a primary pointer press that is not
    // in an overlay, and we've already made sure that there is no
    // longer any active drag operation; begin by setting up the state
    // for a drag operation
    this._ptr.active[0] = ev.pointerId;
    this._ptr.pcx = ev.clientX;
    this._ptr.pcy = ev.clientY;
    this._ptr.bcx = ev.clientX;
    this._ptr.bcy = ev.clientY;
    this._ptr.bcxm = ca[0];
    this._ptr.bcym = ca[1];
    this._ptr.btime = ev.timeStamp;
    this._ptr.bmaxd = 0.0;
    this._ptr.dbl = false;
    
    // Capture the primary pointer
    this._canvas.setPointerCapture(ev.pointerId);
    
    // Finally, handle the beginning of the event
    this._inputBegin(ca[0], ca[1]);
    
  } else {
    // Secondary pointer press -- if we are currently in a drag
    // operation that is in double mode, go back to single mode
    if (this._ptr.active[1] !== undefined) {
      this._inputSingle();
      this._canvas.releasePointerCapture(this._ptr.active[1]);
      this._ptr.active[1] = undefined;
    }
    
    // Due to what we checked earlier and what we just did, we now know
    // that we are in a drag operation and there is no secondary pointer
    // active and that the current event's pointer does not match the
    // main pointer; set the dbl flag to indicate that this drag
    // operation has gone into double mode at some point and then
    // capture the secondary pointer and store this pointer ID as the
    // active secondary pointer
    this._ptr.dbl = true;
    this._ptr.active[1] = ev.pointerId;
    this._canvas.setPointerCapture(ev.pointerId);
    
    // Compute the SQUARE of the distance from (pcx, pcy) to the current
    // position of the secondary pointer
    a = ev.clientX - this._ptr.pcx;
    b = ev.clientY - this._ptr.pcy;
    d = (a * a) + (b * b);
    
    // Signal that we are entering double mode
    this._inputDouble(d);
  }
};

/*
 * Private instance function handler of pointer-move events on the
 * canvas.
 */
PicView.prototype._handlePointerMove = function(ev) {
  var ca, a, b, d;
  
  // Check whether the pointerId of the event matches a currently active
  // primary pointer, a currently active secondary pointer, or neither,
  // and handle differently in each case
  if (ev.pointerId === this._ptr.active[0]) {
    // Pointer matches the primary pointer, so first of all update the
    // pcx/pcy statistics
    this._ptr.pcx = ev.clientX;
    this._ptr.pcy = ev.clientY;
    
    // Next, compute the SQUARE of the distance between the current
    // position of the primary pointer and its position when it was
    // first pressed down
    a = ev.clientX - this._ptr.bcx;
    b = ev.clientY - this._ptr.bcy;
    d = (a * a) + (b * b);
    
    // Update the bmaxd statistic
    if (!(this._ptr.bmaxd >= d)) {
      this._ptr.bmaxd = d;
    }
    
    // We have now update internal state, so next step is to map the
    // current position into canvas coordinate space
    ca = this._mapPointerToCanvas(ev);
    
    // Indicate we are handling this event ourselves
    ev.preventDefault();
    
    // Finally, handle the drag event
    this._inputDrag(ca[0], ca[1]);
    
  } else if (ev.pointerId === this._ptr.active[1]) {
    // Pointer matches the secondary pointer, so compute the SQUARE of
    // the distance between the current secondary pointer position and
    // the most recent primary pointer position
    a = ev.clientX - this._ptr.pcx;
    b = ev.clientY - this._ptr.pcy;
    d = (a * a) + (b * b);
    
    // Indicate we are handling this event ourselves
    ev.preventDefault();
    
    // Handle the zoom event
    this._inputZoom(d);
    
  } else {
    // Pointer does not match any active pointer -- only do something if
    // there are no active pointers AND this event is for the primary
    // pointer, else ignore the event
    if ((this._ptr.active[0] === undefined) && ev.isPrimary) {
      // There are no active pointers and this event is for a primary
      // pointer, so handle a hover event
      ca = this._mapPointerToCanvas(ev);
      ev.preventDefault();
      this._inputHover(ca[0], ca[1]);
    }
  }
};

/*
 * Private instance function handler of pointer-up events on the
 * canvas.
 */
PicView.prototype._handlePointerUp = function(ev) {
  var releasePrimary, releaseSecondary;
  
  // First of all, we want to handle any motion information in the
  // release event, so call through to the move handler first
  this._handlePointerMove(ev);
  
  // Start with the releasePrimary and releaseSecondary flags clear
  releasePrimary = false;
  releaseSecondary = false;
  
  // If the pointer matches an active primary or secondary pointer, set
  // the appropriate release flags
  if (ev.pointerId === this._ptr.active[0]) {
    // Pointer being released is primary, so release the primary and
    // release the secondary if it is also active
    releasePrimary = true;
    if (this._ptr.active[1] !== undefined) {
      releaseSecondary = true;
    }
    
  } else if (ev.pointerId === this._ptr.active[1]) {
    // Pointer being released is secondary, so just release secondary
    releaseSecondary = true;
  }
  
  // If we are doing any release, mark the event as handled
  if (releasePrimary || releaseSecondary) {
    ev.preventDefault();
  }
  
  // If we need to release secondary pointer, handle that
  if (releaseSecondary) {
    this._inputSingle();
    this._canvas.releasePointerCapture(this._ptr.active[1]);
    this._ptr.active[1] = undefined;
  }
  
  // If we need to release primary pointer, handle that
  if (releasePrimary) {
    this._inputEnd();
    this._raiseIfHold(this._ptr.bcxm, this._ptr.bcym, ev.timeStamp);
    this._canvas.releasePointerCapture(this._ptr.active[0]);
    this._ptr.active[0] = undefined;
    this._ptr.pcx = undefined;
    this._ptr.pcy = undefined;
    this._ptr.bcx = undefined;
    this._ptr.bcy = undefined;
    this._ptr.btime = undefined;
    this._ptr.bmaxd = undefined;
    this._ptr.dbl = undefined;
  }
};

/*
 * Public instance functions
 * =========================
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
  
  // Begin by unloading any current views and clearing the ready flag
  this._ready = false;
  this._view  = undefined;
  this._fullv = undefined;
  
  // Repaint to blank the canvas
  this._handlePaint();
  
  // Asynchronously start the image loading process
  this._img.src = src;
};

/*
 * Force a repaint of the canvas.
 */
PicView.prototype.forcePaint = function() {
  this._handlePaint();
};
