/**
 * Created by hubert on 20.03.14.
 */


function pixpos(num, zoom) {
  return Math.round(num*zoom)+0.5;
}

function getrotation(text) {

    if (typeof(text)=="string") {
        var arr = text.match(/R([\d\.]+)/);
        var val = parseFloat(arr[1]);
        var result = Math.PI * val / 180;
        if (text.indexOf("M")>-1) {
            result = -result;
        }
        return result;
    } else {
        return 0;
    }


    switch (text) { // TODO find out what the difference between "R" and "MR" is, parse & use degrees instead of switch()
        case "R90":
        case "MR90":
            return Math.PI/2;
            break;
        case "R180":
        case "MR180":
            return Math.PI;
            break;
        case "R270":
        case "MR270":
            return 3*Math.PI/2;
            break;
        default:
            return 0;
    }
}

function MirrorLayer(layer) {
    if (layer<=16) {
        return (17-layer);
    } else {
        return layer;
    }
}

function NullPrimitive() {
    var self = this;
    self.draw = function(ctx, zoom) {}
}

function WirePrimitive(el, board) {
    var self = this;
    self.board = board;

    self.x1 = parseFloat(el.attr("x1"));
    self.y1 = parseFloat(el.attr("y1"));
    self.x2 = parseFloat(el.attr("x2"));
    self.y2 = parseFloat(el.attr("y2"));
    self.width = parseFloat(el.attr("width"));
    self.layer = parseInt(el.attr("layer"));

    self.draw = function(ctx, zoom) {
        if (self.board.layers[self.layer].visible) {
            ctx.beginPath();
            ctx.strokeStyle = self.board.layers[self.layer].color;
            ctx.lineWidth = self.width*zoom;
            ctx.moveTo(pixpos(self.x1, zoom), pixpos(self.y1, zoom));
            ctx.lineTo(pixpos(self.x2, zoom), pixpos(self.y2, zoom));
            ctx.stroke();
            ctx.closePath();
        }
    }

}

function PolygonPrimitive(el, board) {
    var self = this;
    self.board = board;

    self.width = parseFloat(el.attr("width"));
    self.layer = parseInt(el.attr("layer"));
    self.verteces = [];

    el.children().each(function(index, el)  {
        self.verteces.push({x:parseFloat($(el).attr("x")), y:parseFloat($(el).attr("y"))});
    });

    self.draw = function(ctx, zoom) {
        if (self.board.layers[self.layer].visible) {
            ctx.beginPath();
            ctx.strokeStyle = self.board.layers[self.layer].color;
            ctx.lineWidth = self.width*zoom;
            var startPoint = self.verteces[0];
            ctx.moveTo(pixpos(startPoint.x, zoom), pixpos(startPoint.y, zoom));
            for (var i=1; i<self.verteces.length; i++) {
                ctx.lineTo(pixpos(self.verteces[i].x, zoom), pixpos(self.verteces[i].y, zoom))
            }
            ctx.stroke();
        }
    }
}

function ViaPrimitive(el, board) {
    var self = this;
    self.board = board;

    self.x = parseFloat(el.attr("x"));
    self.y = parseFloat(el.attr("y"));
    self.extent = el.attr("extent");
    self.drill = parseFloat(el.attr("drill"));
    self.diameter = parseFloat(el.attr("diameter"));
    self.shape = el.attr("shape");
    self.layer = 18;

    if (!self.diameter) {
        self.diameter = self.drill * (1+2*self.board.dru.rvViaOuter);
        self.diameter = Math.min(self.diameter, self.drill + 2*self.board.dru.rlMaxViaOuter);
    }
    self.diameter = Math.max(self.diameter, self.drill + 2*self.board.dru.rlMinViaOuter);

    self.draw = function(ctx, zoom) {
        if (self.board.layers[self.layer].visible) {
            ctx.save();
            ctx.lineWidth = 0;
            ctx.fillStyle = self.board.layers[self.layer].color;

            var radius = self.diameter*zoom/2;

            switch (self.shape) {
                case "square":
                    ctx.fillRect(pixpos(self.x, zoom)-radius, pixpos(self.y, zoom)-radius, 2*radius, 2*radius);
                    break;
                case "octagon":
                    ctx.beginPath();
                    ctx.translate(pixpos(self.x, zoom), pixpos(self.y, zoom));
                    ctx.moveTo(-radius,0.4*radius);
                    ctx.lineTo(-0.4*radius, radius);
                    ctx.lineTo(0.4*radius, radius);
                    ctx.lineTo(radius, 0.4*radius);
                    ctx.lineTo(radius, -0.4*radius);
                    ctx.lineTo(0.4*radius, -radius);
                    ctx.lineTo(-0.4*radius, -radius);
                    ctx.lineTo(-radius, -0.4*radius);
                    ctx.lineTo(-radius, 0.4*radius);
                    ctx.fill();
                    ctx.closePath();
                    break;
                default: // round
                    ctx.beginPath();
                    ctx.arc(pixpos(self.x, zoom), pixpos(self.y, zoom), radius, 0, 2*Math.PI, false);
                    ctx.fill();
                    ctx.closePath();
            }

            //self.board.drills.push({});

            // TODO draw drill holes when all shapes are on the canvas?
            ctx.globalCompositeOperation = "xor";
            ctx.beginPath();
            ctx.arc(pixpos(self.x, zoom), pixpos(self.y, zoom), self.drill*zoom/2, 0, 2*Math.PI, false);
            ctx.fill();

            ctx.restore();
        }
    }
}

function PadPrimitive(el, board) {
    var self = this;
    self.board = board;
    self.x = parseFloat(el.attr("x"));
    self.y = parseFloat(el.attr("y"));
    self.drill = parseFloat(el.attr("drill"));
    self.diameter = parseFloat(el.attr("diameter"));
    self.shape = el.attr("shape");
    self.rot = el.attr("rot");
    self.layer = 17;

    if (!self.diameter) { // FIXME use DRU for calculation
        self.diameter = Math.max(1.5*self.drill, self.drill+0.51);
    }


    self.draw = function(ctx, zoom, mirror) {
        if (self.board.layers[self.layer].visible) {
            ctx.save();
            ctx.lineWidth = 0;
            ctx.fillStyle = self.board.layers[self.layer].color;

            var radius = self.diameter*zoom/2;

            ctx.translate(pixpos(self.x, zoom), pixpos(self.y, zoom));
            ctx.rotate(getrotation(self.rot));
            ctx.beginPath();

            switch (self.shape) {
                case "square":
                    ctx.moveTo(-radius,radius);
                    ctx.lineTo(radius, radius);
                    ctx.lineTo(radius, -radius);
                    ctx.lineTo(-radius, -radius);
                    break;
                case "octagon":
                    ctx.moveTo(-radius,0.4*radius);
                    ctx.lineTo(-0.4*radius, radius);
                    ctx.lineTo(0.4*radius, radius);
                    ctx.lineTo(radius, 0.4*radius);
                    ctx.lineTo(radius, -0.4*radius);
                    ctx.lineTo(0.4*radius, -radius);
                    ctx.lineTo(-0.4*radius, -radius);
                    ctx.lineTo(-radius, -0.4*radius);
                    ctx.lineTo(-radius, 0.4*radius);
                    break;
                case "long":
                    ctx.arc(-radius, 0, radius, Math.PI/2, 1.5*Math.PI, false);
                    ctx.arc(+radius, 0, radius, 1.5*Math.PI, Math.PI/2, false);
                    break;
                case "offset":
                    ctx.arc(0, 0, radius, Math.PI/2, 1.5*Math.PI, false);
                    ctx.arc(2*radius, 0, radius, 1.5*Math.PI, Math.PI/2, false);
                    break;
                default: // round
                    ctx.beginPath();
                    ctx.arc(0, 0, radius, 0, 2*Math.PI, false);
            }
            ctx.fill();
            ctx.closePath();

            ctx.globalCompositeOperation = "xor";
            ctx.beginPath();
            ctx.arc(0, 0, self.drill*zoom/2, 0, 2*Math.PI, false);
            ctx.fill();

            ctx.restore();
        }
    }
}

function SmdPrimitive(el, board) {
    var self = this;
    self.board = board;
    // <smd name="1" x="-8.89" y="-2.159" dx="1.27" dy="1.524" layer="16" roundness="75"/>
    self.name = el.attr("name");
    self.x = parseFloat(el.attr("x"));
    self.y = parseFloat(el.attr("y"));
    self.dx = parseFloat(el.attr("dx"));
    self.dy = parseFloat(el.attr("dy"));
    self.layer = parseInt(el.attr("layer"));
    self.roundness = parseInt(el.attr("roundness")); // TODO implement round SMD pads
    self.rot = el.attr("rot");

    self.draw = function(ctx, zoom, mirror) {

        var layer = (mirror) ? MirrorLayer(self.layer) : self.layer;

        if (self.board.layers[layer].visible) {
            ctx.save();
            ctx.lineWidth = 0;
            ctx.fillStyle = self.board.layers[layer].color;

            ctx.translate(pixpos(self.x,zoom), pixpos(self.y,zoom));
            ctx.rotate(getrotation(self.rot));
            ctx.fillRect(-self.dx*zoom/2, -self.dy*zoom/2, self.dx*zoom, self.dy*zoom);
            ctx.restore();
        }
    }
}

function PrimitiveFactory(el, board) {
    switch (el.prop("tagName")) {
        case "wire":
            return new WirePrimitive(el, board);
        case "polygon":
            return new PolygonPrimitive(el, board);
        case "via":
            return new ViaPrimitive(el, board);
        case "pad":
            return new PadPrimitive(el, board);
        case "smd":
            return new SmdPrimitive(el, board);
        default:
            return new NullPrimitive();
    }
}

function ComposedObject(parentEl, board) {
    var self = this;
    self.board = board;
    self.primitives = [];

    self.init = function(parentEl) {
        parentEl.children().each(function(index, el) {
            self.primitives.push(PrimitiveFactory($(el), self.board))
        });
    }

    self.draw = function(ctx, zoom, mirror) {
        if (mirror) { ctx.scale(-1,1); }
        $.each(self.primitives, function(index, el) {
           el.draw(ctx, zoom, mirror);
        });
    }

    self.init(parentEl);
}

function Library(el, board) {
    var self = this;
    self.board = board;

    self.init = function(el) {
        self.name = el.attr("name");
        self.packages = {};
        el.find("packages").find("package").each(function(index, packageel) {
            self.packages[$(packageel).attr("name")] = new ComposedObject($(packageel), self.board);
        });
    }

    self.init(el);
}

function Element(el, board) {
    var self = this;
    self.board = board;

    self.init = function() {
        self.name = el.attr("name");
        self.library = el.attr("library");
        self.package = el.attr("package");
        self.value = el.attr("value");
        self.x = parseFloat(el.attr("x"));
        self.y = parseFloat(el.attr("y"));
        self.rot = el.attr("rot");
        self.mirror = (self.rot && (self.rot.indexOf("M")>-1));

        self.packageobj = self.board.libraries[self.library].packages[self.package];
    }

    self.draw = function(ctx, zoom) {
        ctx.save();
        ctx.translate(self.x*zoom, self.y*zoom);
        ctx.rotate(getrotation(self.rot));
        self.packageobj.draw(ctx, zoom, self.mirror);
        ctx.restore();
    }

    self.init();
}

function Signal(el, board) {
    var self = this;
    self.board = board;
    self.name = el.attr("name");
    self.primitives = new ComposedObject(el, self.board);

    self.draw = function(ctx, zoom) {
        self.primitives.draw(ctx, zoom);
    }
}

function convertToMM(value) {
    var arr = value.match(/([\d\.]+)(.*)/);

    var val = parseFloat(arr[1]);
    var unit  = arr[2];

    switch (unit) {
        case "mm":
            return val;
        case "mic":
            return val/1000;
        case "mil":
            return val/39.3700787;
        case "inch":
            return val/0.0393700787;
        default:
            return null;
    }
}

function EagleBoard(xml) {
    var self = this;

    self.drills = [];
    self.drawing = xml.find("drawing");

    self.dru = {};
    self.drawing.find("designrules").find("param").each(function(index, el) {
        var name = $(el).attr("name");
        var value = $(el).attr("value");

        if (["mnLayersViaInSmd", "msBlindViaRatio", "rvPadTop", "rvPadInner", "rvPadBottom", "rvViaOuter", "rvViaInner",
             "rvMicroViaOuter", "rvMicroViaInner", "psTop", "psBottom", "psFirst", "psElongationLong", "psElongationOffset",
            "mvStopFrame", "mvCreamFrame", "srRoundness", "slThermalsForVias", "dpGapFactor", "checkGrid", "checkAngle",
            "checkFont", "checkRestrict", "useDiameter", "maxErrors"].indexOf(name)>-1)
        {
            value = parseFloat(value);
        } else if (["mdWireWire", "mdWirePad", "mdWireVia", "mdPadPad", "mdPadVia", "mdViaVia", "mdSmdPad", "mdSmdVia", "mdSmdSmd",
                    "mdViaViaSameLayer", "mdCopperDimension", "mdDrill", "mdSmdStop", "msWidth", "msDrill", "msMicroVia",
                    "rlMinPadTop", "rlMaxPadTop", "rlMinPadInner", "rlMaxPadInner", "rlMinPadBottom", "rlMaxPadBottom",
                    "rlMinViaOuter", "rlMaxViaOuter", "rlMinViaInner", "rlMaxViaInner", "rlMinMicroViaOuter", "rlMaxMicroViaOuter",
                    "rlMinMicroViaInner", "rlMaxMicroViaInner", "mlMinStopFrame", "mlMaxStopFrame", "mlMinCreamFrame", "mlMaxCreamFrame",
                    "mlViaStopLimit", "srMinRoundness", "srMaxRoundness", "slThermalIsolate", "dpMaxLengthDifference"].indexOf(name)>-1) {
            value = convertToMM(value);
        }

        self.dru[name] = value;
    });
    self.layerColors = {
         1: "#8d2323", // TOP
         2: "#b4b400",
        15: "#b400b4",
        16: "#23238d", // BOTTOM
        17: "#238d23", // PADS
        18: "#238d23", // VIAS
        19: "#8d8d23", // unrouted
        20: "#b4b4b4", // dimension
        21: "#8d8d8d", // tplace
        22: "#8d8d8d", // bplace
        23: "#b4b4b4", // torigins
        24: "#b4b4b4", // borigins
        25: "#8d8d8d", // tnames
        26: "#8d8d8d", // bnames
        27: "#8d8d8d", // tvalues
        28: "#8d8d8d", // bvalues
        37: "#8d8d8d", // tTest
        38: "#8d8d8d", // bTest
        48: "#8d8d8d", // Document
        49: "#8d8d8d", // Reference
        51: "#8d8d8d", // tDocu
        52: "#8d8d8d" // bDocu
    }
    self.layers = {};
    self.drawing.find("layers").find("layer").each(function(index, el) {
        el = $(el);
        var layer = {
           number: el.attr("number"),
           name: el.attr("name"),
           color: el.attr("color"),
           fill: el.attr("fill"),
           visible: el.attr("visible")!="no",
           active: el.attr("active")!="no"
        }
        layer.color = self.layerColors[layer.number] || "#FFFF00";
        self.layers[layer.number] = layer;
    });


    self.libraries = {};
    self.drawing.find("libraries").find("library").each(function(index, el) {
        var lib = new Library($(el), self);
        self.libraries[lib.name] = lib;
    });

    self.plain = new ComposedObject(self.drawing.find("plain"), self);

    self.elements = [];
    self.drawing.find("elements").find("element").each(function(index, el) {
        self.elements.push(new Element($(el), self));
    });

    self.signals = [];
    self.drawing.find("signals").find("signal").each(function(index, el) {
        self.signals.push(new Signal($(el), self));

    });

    self.draw = function(ctx, offsetX, offsetY, zoom) {
        self.drills = [];
        ctx.canvas.width  = ctx.canvas.width;
        ctx.canvas.height = ctx.canvas.height;
        ctx.translate(offsetX, offsetY);
        ctx.scale(1,-1);

        ctx.beginPath();
        ctx.strokeStyle="white";
        ctx.lineWidth = 1;
        ctx.moveTo(0,pixpos(1, zoom)); ctx.lineTo(0, pixpos(-1, zoom));
        ctx.moveTo(pixpos(1, zoom),0); ctx.lineTo(pixpos(-1, zoom), 0);
        ctx.stroke();

        $.each(self.signals, function(index, el) { el.draw(ctx, zoom); });
        $.each(self.elements, function(index, el) { el.draw(ctx, zoom); });
        self.plain.draw(ctx, zoom);


        $.each(self.drills, function(index, el) {

        })

    }

}

var xml = null;
$(function() {
    var ctx = $("#board").get(0).getContext('2d');


    var board = null;
    var zoom = 5;
    var offsetX = ctx.canvas.width/2;
    var offsetY = ctx.canvas.height/2;


    //$.get("tests/rotate.xml", function(data) {
    $.get("pigmeu.xml", function(data){
        board = new EagleBoard($(data));
        board.draw(ctx, offsetX, offsetY, zoom);
    });

    function onMouseWheel(e) {
        var e = window.event || e;
        var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));

        if (delta>0) {
            zoom *= 1.1;
        }
        if (delta<0) {
            zoom /= 1.1;
        }

        board.draw(ctx, offsetX, offsetY, zoom);
        e.preventDefault();
        e.stopPropagation();
    }

    $("body").on("mousewheel", onMouseWheel);
    $("body").on("DOMMouseScroll", onMouseWheel);
    var dragXstart = 0;
    var dragYstart = 0;
    var dragging = false;

    $("body").mousedown(function(ev) {
        dragXstart = ev.screenX;
        dragYstart = ev.screenY;
        dragging = true;
    });
    $("body").mouseup(function(ev) {
        dragging = false;
        offsetX += ev.screenX - dragXstart;
        offsetY += ev.screenY - dragYstart;
        board.draw(ctx, offsetX, offsetY, zoom);
    });

    $("body").mousemove(function(ev) {
        if (dragging) {
            board.draw(ctx, offsetX + ev.screenX - dragXstart, offsetY + ev.screenY - dragYstart, zoom);
        }
    });


    $("body").on("dragover", function(e) {e.preventDefault(); e.stopPropagation(); });
    $("body").on("dragenter", function(e) {e.preventDefault(); e.stopPropagation(); });
    $("body").on("drop", function(e) {
        e.preventDefault();
        var file = e.originalEvent.dataTransfer.files[0];
        var freader = new FileReader();
        freader.onloadend = function(thefile) {
            var xml = $($.parseXML(this.result));
            board = new EagleBoard(xml);
            board.draw(ctx, offsetX, offsetY, zoom);
        }
        freader.readAsText(file);
    });

});