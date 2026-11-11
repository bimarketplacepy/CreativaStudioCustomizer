import{createRequire}from"module";const require=createRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../../node_modules/.pnpm/opentype.js@2.0.0/node_modules/opentype.js/dist/opentype.js
var require_opentype = __commonJS({
  "../../node_modules/.pnpm/opentype.js@2.0.0/node_modules/opentype.js/dist/opentype.js"(exports, module) {
    var opentype3 = (() => {
      var __defProp2 = Object.defineProperty;
      var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
      var __getOwnPropNames2 = Object.getOwnPropertyNames;
      var __hasOwnProp2 = Object.prototype.hasOwnProperty;
      var __export = (target, all) => {
        for (var name in all)
          __defProp2(target, name, { get: all[name], enumerable: true });
      };
      var __copyProps2 = (to, from, except, desc) => {
        if (from && typeof from === "object" || typeof from === "function") {
          for (let key of __getOwnPropNames2(from))
            if (!__hasOwnProp2.call(to, key) && key !== except)
              __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
        }
        return to;
      };
      var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
      var opentype_exports = {};
      __export(opentype_exports, {
        BoundingBox: () => bbox_default,
        Font: () => font_default,
        Glyph: () => glyph_default,
        Path: () => path_default,
        _parse: () => parse_default,
        load: () => load,
        loadSync: () => loadSync,
        parse: () => parseBuffer
      });
      var TINF_OK = 0;
      var TINF_DATA_ERROR = -3;
      function Tree() {
        this.table = new Uint16Array(16);
        this.trans = new Uint16Array(288);
      }
      function Data(source, dest) {
        this.source = source;
        this.sourceIndex = 0;
        this.tag = 0;
        this.bitcount = 0;
        this.dest = dest;
        this.destLen = 0;
        this.ltree = new Tree();
        this.dtree = new Tree();
      }
      var sltree = new Tree();
      var sdtree = new Tree();
      var length_bits = new Uint8Array(30);
      var length_base = new Uint16Array(30);
      var dist_bits = new Uint8Array(30);
      var dist_base = new Uint16Array(30);
      var clcidx = new Uint8Array([
        16,
        17,
        18,
        0,
        8,
        7,
        9,
        6,
        10,
        5,
        11,
        4,
        12,
        3,
        13,
        2,
        14,
        1,
        15
      ]);
      var code_tree = new Tree();
      var lengths = new Uint8Array(288 + 32);
      function tinf_build_bits_base(bits, base, delta, first) {
        var i, sum;
        for (i = 0; i < delta; ++i) bits[i] = 0;
        for (i = 0; i < 30 - delta; ++i) bits[i + delta] = i / delta | 0;
        for (sum = first, i = 0; i < 30; ++i) {
          base[i] = sum;
          sum += 1 << bits[i];
        }
      }
      function tinf_build_fixed_trees(lt, dt) {
        var i;
        for (i = 0; i < 7; ++i) lt.table[i] = 0;
        lt.table[7] = 24;
        lt.table[8] = 152;
        lt.table[9] = 112;
        for (i = 0; i < 24; ++i) lt.trans[i] = 256 + i;
        for (i = 0; i < 144; ++i) lt.trans[24 + i] = i;
        for (i = 0; i < 8; ++i) lt.trans[24 + 144 + i] = 280 + i;
        for (i = 0; i < 112; ++i) lt.trans[24 + 144 + 8 + i] = 144 + i;
        for (i = 0; i < 5; ++i) dt.table[i] = 0;
        dt.table[5] = 32;
        for (i = 0; i < 32; ++i) dt.trans[i] = i;
      }
      var offs = new Uint16Array(16);
      function tinf_build_tree(t, lengths2, off, num) {
        var i, sum;
        for (i = 0; i < 16; ++i) t.table[i] = 0;
        for (i = 0; i < num; ++i) t.table[lengths2[off + i]]++;
        t.table[0] = 0;
        for (sum = 0, i = 0; i < 16; ++i) {
          offs[i] = sum;
          sum += t.table[i];
        }
        for (i = 0; i < num; ++i) {
          if (lengths2[off + i]) t.trans[offs[lengths2[off + i]]++] = i;
        }
      }
      function tinf_getbit(d) {
        if (!d.bitcount--) {
          d.tag = d.source[d.sourceIndex++];
          d.bitcount = 7;
        }
        var bit = d.tag & 1;
        d.tag >>>= 1;
        return bit;
      }
      function tinf_read_bits(d, num, base) {
        if (!num)
          return base;
        while (d.bitcount < 24) {
          d.tag |= d.source[d.sourceIndex++] << d.bitcount;
          d.bitcount += 8;
        }
        var val = d.tag & 65535 >>> 16 - num;
        d.tag >>>= num;
        d.bitcount -= num;
        return val + base;
      }
      function tinf_decode_symbol(d, t) {
        while (d.bitcount < 24) {
          d.tag |= d.source[d.sourceIndex++] << d.bitcount;
          d.bitcount += 8;
        }
        var sum = 0, cur = 0, len = 0;
        var tag = d.tag;
        do {
          cur = 2 * cur + (tag & 1);
          tag >>>= 1;
          ++len;
          sum += t.table[len];
          cur -= t.table[len];
        } while (cur >= 0);
        d.tag = tag;
        d.bitcount -= len;
        return t.trans[sum + cur];
      }
      function tinf_decode_trees(d, lt, dt) {
        var hlit, hdist, hclen;
        var i, num, length;
        hlit = tinf_read_bits(d, 5, 257);
        hdist = tinf_read_bits(d, 5, 1);
        hclen = tinf_read_bits(d, 4, 4);
        for (i = 0; i < 19; ++i) lengths[i] = 0;
        for (i = 0; i < hclen; ++i) {
          var clen = tinf_read_bits(d, 3, 0);
          lengths[clcidx[i]] = clen;
        }
        tinf_build_tree(code_tree, lengths, 0, 19);
        for (num = 0; num < hlit + hdist; ) {
          var sym = tinf_decode_symbol(d, code_tree);
          switch (sym) {
            case 16:
              var prev = lengths[num - 1];
              for (length = tinf_read_bits(d, 2, 3); length; --length) {
                lengths[num++] = prev;
              }
              break;
            case 17:
              for (length = tinf_read_bits(d, 3, 3); length; --length) {
                lengths[num++] = 0;
              }
              break;
            case 18:
              for (length = tinf_read_bits(d, 7, 11); length; --length) {
                lengths[num++] = 0;
              }
              break;
            default:
              lengths[num++] = sym;
              break;
          }
        }
        tinf_build_tree(lt, lengths, 0, hlit);
        tinf_build_tree(dt, lengths, hlit, hdist);
      }
      function tinf_inflate_block_data(d, lt, dt) {
        for (; ; ) {
          var sym = tinf_decode_symbol(d, lt);
          if (sym === 256) {
            return TINF_OK;
          }
          if (sym < 256) {
            d.dest[d.destLen++] = sym;
          } else {
            var length, dist, offs2;
            var i;
            sym -= 257;
            length = tinf_read_bits(d, length_bits[sym], length_base[sym]);
            dist = tinf_decode_symbol(d, dt);
            offs2 = d.destLen - tinf_read_bits(d, dist_bits[dist], dist_base[dist]);
            for (i = offs2; i < offs2 + length; ++i) {
              d.dest[d.destLen++] = d.dest[i];
            }
          }
        }
      }
      function tinf_inflate_uncompressed_block(d) {
        var length, invlength;
        var i;
        while (d.bitcount > 8) {
          d.sourceIndex--;
          d.bitcount -= 8;
        }
        length = d.source[d.sourceIndex + 1];
        length = 256 * length + d.source[d.sourceIndex];
        invlength = d.source[d.sourceIndex + 3];
        invlength = 256 * invlength + d.source[d.sourceIndex + 2];
        if (length !== (~invlength & 65535))
          return TINF_DATA_ERROR;
        d.sourceIndex += 4;
        for (i = length; i; --i)
          d.dest[d.destLen++] = d.source[d.sourceIndex++];
        d.bitcount = 0;
        return TINF_OK;
      }
      function tinf_uncompress(source, dest) {
        var d = new Data(source, dest);
        var bfinal, btype, res;
        do {
          bfinal = tinf_getbit(d);
          btype = tinf_read_bits(d, 2, 0);
          switch (btype) {
            case 0:
              res = tinf_inflate_uncompressed_block(d);
              break;
            case 1:
              res = tinf_inflate_block_data(d, sltree, sdtree);
              break;
            case 2:
              tinf_decode_trees(d, d.ltree, d.dtree);
              res = tinf_inflate_block_data(d, d.ltree, d.dtree);
              break;
            default:
              res = TINF_DATA_ERROR;
          }
          if (res !== TINF_OK)
            throw new Error("Data error");
        } while (!bfinal);
        if (d.destLen < d.dest.length) {
          if (typeof d.dest.slice === "function")
            return d.dest.slice(0, d.destLen);
          else
            return d.dest.subarray(0, d.destLen);
        }
        return d.dest;
      }
      tinf_build_fixed_trees(sltree, sdtree);
      tinf_build_bits_base(length_bits, length_base, 4, 3);
      tinf_build_bits_base(dist_bits, dist_base, 2, 1);
      length_bits[28] = 0;
      length_base[28] = 258;
      function derive(v0, v1, v2, v3, t) {
        return Math.pow(1 - t, 3) * v0 + 3 * Math.pow(1 - t, 2) * t * v1 + 3 * (1 - t) * Math.pow(t, 2) * v2 + Math.pow(t, 3) * v3;
      }
      function BoundingBox() {
        this.x1 = Number.NaN;
        this.y1 = Number.NaN;
        this.x2 = Number.NaN;
        this.y2 = Number.NaN;
      }
      BoundingBox.prototype.isEmpty = function() {
        return isNaN(this.x1) || isNaN(this.y1) || isNaN(this.x2) || isNaN(this.y2);
      };
      BoundingBox.prototype.addPoint = function(x, y) {
        if (typeof x === "number") {
          if (isNaN(this.x1) || isNaN(this.x2)) {
            this.x1 = x;
            this.x2 = x;
          }
          if (x < this.x1) {
            this.x1 = x;
          }
          if (x > this.x2) {
            this.x2 = x;
          }
        }
        if (typeof y === "number") {
          if (isNaN(this.y1) || isNaN(this.y2)) {
            this.y1 = y;
            this.y2 = y;
          }
          if (y < this.y1) {
            this.y1 = y;
          }
          if (y > this.y2) {
            this.y2 = y;
          }
        }
      };
      BoundingBox.prototype.addX = function(x) {
        this.addPoint(x, null);
      };
      BoundingBox.prototype.addY = function(y) {
        this.addPoint(null, y);
      };
      BoundingBox.prototype.addBezier = function(x0, y0, x1, y1, x2, y2, x, y) {
        const p0 = [x0, y0];
        const p1 = [x1, y1];
        const p2 = [x2, y2];
        const p3 = [x, y];
        this.addPoint(x0, y0);
        this.addPoint(x, y);
        for (let i = 0; i <= 1; i++) {
          const b = 6 * p0[i] - 12 * p1[i] + 6 * p2[i];
          const a = -3 * p0[i] + 9 * p1[i] - 9 * p2[i] + 3 * p3[i];
          const c = 3 * p1[i] - 3 * p0[i];
          if (a === 0) {
            if (b === 0) continue;
            const t = -c / b;
            if (0 < t && t < 1) {
              if (i === 0) this.addX(derive(p0[i], p1[i], p2[i], p3[i], t));
              if (i === 1) this.addY(derive(p0[i], p1[i], p2[i], p3[i], t));
            }
            continue;
          }
          const b2ac = Math.pow(b, 2) - 4 * c * a;
          if (b2ac < 0) continue;
          const t1 = (-b + Math.sqrt(b2ac)) / (2 * a);
          if (0 < t1 && t1 < 1) {
            if (i === 0) this.addX(derive(p0[i], p1[i], p2[i], p3[i], t1));
            if (i === 1) this.addY(derive(p0[i], p1[i], p2[i], p3[i], t1));
          }
          const t2 = (-b - Math.sqrt(b2ac)) / (2 * a);
          if (0 < t2 && t2 < 1) {
            if (i === 0) this.addX(derive(p0[i], p1[i], p2[i], p3[i], t2));
            if (i === 1) this.addY(derive(p0[i], p1[i], p2[i], p3[i], t2));
          }
        }
      };
      BoundingBox.prototype.addQuad = function(x0, y0, x1, y1, x, y) {
        const cp1x = x0 + 2 / 3 * (x1 - x0);
        const cp1y = y0 + 2 / 3 * (y1 - y0);
        const cp2x = cp1x + 1 / 3 * (x - x0);
        const cp2y = cp1y + 1 / 3 * (y - y0);
        this.addBezier(x0, y0, cp1x, cp1y, cp2x, cp2y, x, y);
      };
      var bbox_default = BoundingBox;
      function Path() {
        this.commands = [];
        this.fill = "black";
        this.stroke = null;
        this.strokeWidth = 1;
      }
      var decimalRoundingCache = {};
      function roundDecimal(float, places) {
        const integerPart = Math.floor(float);
        const decimalPart = float - integerPart;
        if (!decimalRoundingCache[places]) {
          decimalRoundingCache[places] = {};
        }
        if (decimalRoundingCache[places][decimalPart] !== void 0) {
          const roundedDecimalPart2 = decimalRoundingCache[places][decimalPart];
          return integerPart + roundedDecimalPart2;
        }
        const roundedDecimalPart = +(Math.round(decimalPart + "e+" + places) + "e-" + places);
        decimalRoundingCache[places][decimalPart] = roundedDecimalPart;
        return integerPart + roundedDecimalPart;
      }
      function optimizeCommands(commands) {
        let subpaths = [[]];
        let startX = 0, startY = 0;
        for (let i = 0; i < commands.length; i += 1) {
          const subpath = subpaths[subpaths.length - 1];
          const cmd = commands[i];
          const firstCommand = subpath[0];
          const secondCommand = subpath[1];
          const previousCommand = subpath[subpath.length - 1];
          const nextCommand = commands[i + 1];
          subpath.push(cmd);
          if (cmd.type === "M") {
            startX = cmd.x;
            startY = cmd.y;
          } else if (cmd.type === "L" && (!nextCommand || nextCommand.type === "Z")) {
            if (!(Math.abs(cmd.x - startX) > 1 || Math.abs(cmd.y - startY) > 1)) {
              subpath.pop();
            }
          } else if (cmd.type === "L" && previousCommand && previousCommand.x === cmd.x && previousCommand.y === cmd.y) {
            subpath.pop();
          } else if (cmd.type === "Z") {
            if (firstCommand && secondCommand && previousCommand && firstCommand.type === "M" && secondCommand.type === "L" && previousCommand.type === "L" && previousCommand.x === firstCommand.x && previousCommand.y === firstCommand.y) {
              subpath.shift();
              subpath[0].type = "M";
            }
            if (i + 1 < commands.length) {
              subpaths.push([]);
            }
          }
        }
        commands = [].concat.apply([], subpaths);
        return commands;
      }
      function createSVGParsingOptions(options) {
        const defaultOptions = {
          decimalPlaces: 2,
          optimize: true,
          flipY: true,
          flipYBase: void 0,
          scale: 1,
          x: 0,
          y: 0
        };
        const newOptions = Object.assign({}, defaultOptions, options);
        return newOptions;
      }
      function createSVGOutputOptions(options) {
        if (parseInt(options) === options) {
          options = { decimalPlaces: options, flipY: false };
        }
        const defaultOptions = {
          decimalPlaces: 2,
          optimize: true,
          flipY: true,
          flipYBase: void 0
        };
        const newOptions = Object.assign({}, defaultOptions, options);
        return newOptions;
      }
      Path.prototype.fromSVG = function(pathData, options = {}) {
        if (typeof SVGPathElement !== "undefined" && pathData instanceof SVGPathElement) {
          pathData = pathData.getAttribute("d");
        }
        options = createSVGParsingOptions(options);
        this.commands = [];
        const number = "0123456789";
        const supportedCommands = "MmLlQqCcZzHhVv";
        const unsupportedCommands = "SsTtAa";
        const sign = "-+";
        let command = {};
        let buffer = [""];
        let isUnexpected = false;
        function parseBuffer2(buffer2) {
          return buffer2.filter((b) => b.length).map((b) => {
            let float = parseFloat(b);
            if (options.decimalPlaces || options.decimalPlaces === 0) {
              float = roundDecimal(float, options.decimalPlaces);
            }
            return float;
          });
        }
        function makeRelative(buffer2) {
          if (!this.commands.length) {
            return buffer2;
          }
          const lastCommand = this.commands[this.commands.length - 1];
          for (let i = 0; i < buffer2.length; i++) {
            buffer2[i] += lastCommand[i & 1 ? "y" : "x"];
          }
          return buffer2;
        }
        function applyCommand() {
          if (command.type === void 0) {
            return;
          }
          const commandType = command.type.toUpperCase();
          const relative = commandType !== "Z" && command.type.toUpperCase() !== command.type;
          let parsedBuffer = parseBuffer2(buffer);
          buffer = [""];
          if (!parsedBuffer.length && commandType !== "Z") {
            return;
          }
          if (relative && commandType !== "H" && commandType !== "V") {
            parsedBuffer = makeRelative.apply(this, [parsedBuffer]);
          }
          const currentX = this.commands.length ? this.commands[this.commands.length - 1].x || 0 : 0;
          const currentY = this.commands.length ? this.commands[this.commands.length - 1].y || 0 : 0;
          switch (commandType) {
            case "M":
              this.moveTo(...parsedBuffer);
              break;
            case "L":
              this.lineTo(...parsedBuffer);
              break;
            case "V":
              for (let i = 0; i < parsedBuffer.length; i++) {
                let offset = 0;
                if (relative) {
                  offset = this.commands.length ? this.commands[this.commands.length - 1].y || 0 : 0;
                }
                this.lineTo(currentX, parsedBuffer[i] + offset);
              }
              break;
            case "H":
              for (let i = 0; i < parsedBuffer.length; i++) {
                let offset = 0;
                if (relative) {
                  offset = this.commands.length ? this.commands[this.commands.length - 1].x || 0 : 0;
                }
                this.lineTo(parsedBuffer[i] + offset, currentY);
              }
              break;
            case "C":
              this.bezierCurveTo(...parsedBuffer);
              break;
            case "Q":
              this.quadraticCurveTo(...parsedBuffer);
              break;
            case "Z":
              if (this.commands.length < 1 || this.commands[this.commands.length - 1].type !== "Z") {
                this.close();
              }
              break;
          }
          if (this.commands.length) {
            for (const prop in this.commands[this.commands.length - 1]) {
              if (this.commands[this.commands.length - 1][prop] === void 0) {
                this.commands[this.commands.length - 1][prop] = 0;
              }
            }
          }
        }
        for (let i = 0; i < pathData.length; i++) {
          const token = pathData.charAt(i);
          const lastBuffer = buffer[buffer.length - 1];
          if (number.indexOf(token) > -1) {
            buffer[buffer.length - 1] += token;
          } else if (sign.indexOf(token) > -1) {
            if (!command.type && !this.commands.length) {
              command.type = "L";
            }
            if (token === "-") {
              if (!command.type || lastBuffer.indexOf("-") > 0) {
                isUnexpected = true;
              } else if (lastBuffer.length) {
                buffer.push("-");
              } else {
                buffer[buffer.length - 1] = token;
              }
            } else {
              if (!command.type || lastBuffer.length > 0) {
                isUnexpected = true;
              } else {
                continue;
              }
            }
          } else if (supportedCommands.indexOf(token) > -1) {
            if (command.type) {
              applyCommand.apply(this);
              command = { type: token };
            } else {
              command.type = token;
            }
          } else if (unsupportedCommands.indexOf(token) > -1) {
            throw new Error("Unsupported path command: " + token + ". Currently supported commands are " + supportedCommands.split("").join(", ") + ".");
          } else if (" ,	\n\r\f\v".indexOf(token) > -1) {
            buffer.push("");
          } else if (token === ".") {
            if (!command.type || lastBuffer.indexOf(token) > -1) {
              isUnexpected = true;
            } else {
              buffer[buffer.length - 1] += token;
            }
          } else {
            isUnexpected = true;
          }
          if (isUnexpected) {
            throw new Error("Unexpected character: " + token + " at offset " + i);
          }
        }
        applyCommand.apply(this);
        if (options.optimize) {
          this.commands = optimizeCommands(this.commands);
        }
        const flipY = options.flipY;
        let flipYBase = options.flipYBase;
        if (flipY === true && options.flipYBase === void 0) {
          const boundingBox = this.getBoundingBox();
          flipYBase = boundingBox.y1 + boundingBox.y2;
        }
        for (const i in this.commands) {
          const cmd = this.commands[i];
          for (const prop in cmd) {
            if (["x", "x1", "x2"].includes(prop)) {
              this.commands[i][prop] = options.x + cmd[prop] * options.scale;
            } else if (["y", "y1", "y2"].includes(prop)) {
              this.commands[i][prop] = options.y + (flipY ? flipYBase - cmd[prop] : cmd[prop]) * options.scale;
            }
          }
        }
        return this;
      };
      Path.fromSVG = function(path2, options) {
        const newPath = new Path();
        return newPath.fromSVG(path2, options);
      };
      Path.prototype.moveTo = function(x, y) {
        this.commands.push({
          type: "M",
          x,
          y
        });
      };
      Path.prototype.lineTo = function(x, y) {
        this.commands.push({
          type: "L",
          x,
          y
        });
      };
      Path.prototype.curveTo = Path.prototype.bezierCurveTo = function(x1, y1, x2, y2, x, y) {
        this.commands.push({
          type: "C",
          x1,
          y1,
          x2,
          y2,
          x,
          y
        });
      };
      Path.prototype.quadTo = Path.prototype.quadraticCurveTo = function(x1, y1, x, y) {
        this.commands.push({
          type: "Q",
          x1,
          y1,
          x,
          y
        });
      };
      Path.prototype.close = Path.prototype.closePath = function() {
        this.commands.push({
          type: "Z"
        });
      };
      Path.prototype.extend = function(pathOrCommands) {
        if (pathOrCommands.commands) {
          pathOrCommands = pathOrCommands.commands;
        } else if (pathOrCommands instanceof bbox_default) {
          const box = pathOrCommands;
          this.moveTo(box.x1, box.y1);
          this.lineTo(box.x2, box.y1);
          this.lineTo(box.x2, box.y2);
          this.lineTo(box.x1, box.y2);
          this.close();
          return;
        }
        Array.prototype.push.apply(this.commands, pathOrCommands);
      };
      Path.prototype.getBoundingBox = function() {
        const box = new bbox_default();
        let startX = 0;
        let startY = 0;
        let prevX = 0;
        let prevY = 0;
        for (let i = 0; i < this.commands.length; i++) {
          const cmd = this.commands[i];
          switch (cmd.type) {
            case "M":
              box.addPoint(cmd.x, cmd.y);
              startX = prevX = cmd.x;
              startY = prevY = cmd.y;
              break;
            case "L":
              box.addPoint(cmd.x, cmd.y);
              prevX = cmd.x;
              prevY = cmd.y;
              break;
            case "Q":
              box.addQuad(prevX, prevY, cmd.x1, cmd.y1, cmd.x, cmd.y);
              prevX = cmd.x;
              prevY = cmd.y;
              break;
            case "C":
              box.addBezier(prevX, prevY, cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
              prevX = cmd.x;
              prevY = cmd.y;
              break;
            case "Z":
              prevX = startX;
              prevY = startY;
              break;
            default:
              throw new Error("Unexpected path command " + cmd.type);
          }
        }
        if (box.isEmpty()) {
          box.addPoint(0, 0);
        }
        return box;
      };
      Path.prototype.draw = function(ctx) {
        const layers = this._layers;
        if (layers && layers.length) {
          for (let l = 0; l < layers.length; l++) {
            this.draw.call(layers[l], ctx);
          }
          return;
        }
        const image = this._image;
        if (image) {
          ctx.drawImage(image.image, image.x, image.y, image.width, image.height);
          return;
        }
        ctx.beginPath();
        for (let i = 0; i < this.commands.length; i += 1) {
          const cmd = this.commands[i];
          if (cmd.type === "M") {
            ctx.moveTo(cmd.x, cmd.y);
          } else if (cmd.type === "L") {
            ctx.lineTo(cmd.x, cmd.y);
          } else if (cmd.type === "C") {
            ctx.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
          } else if (cmd.type === "Q") {
            ctx.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y);
          } else if (cmd.type === "Z" && this.stroke && this.strokeWidth) {
            ctx.closePath();
          }
        }
        if (this.fill) {
          ctx.fillStyle = this.fill;
          ctx.fill();
        }
        if (this.stroke) {
          ctx.strokeStyle = this.stroke;
          ctx.lineWidth = this.strokeWidth;
          ctx.stroke();
        }
      };
      Path.prototype.toPathData = function(options) {
        options = createSVGOutputOptions(options);
        function floatToString(v) {
          const rounded = roundDecimal(v, options.decimalPlaces);
          if (Math.round(v) === rounded) {
            return "" + rounded;
          } else {
            return rounded.toFixed(options.decimalPlaces);
          }
        }
        function packValues() {
          let s = "";
          for (let i = 0; i < arguments.length; i += 1) {
            const v = arguments[i];
            if (v >= 0 && i > 0) {
              s += " ";
            }
            s += floatToString(v);
          }
          return s;
        }
        let commandsCopy = this.commands;
        if (options.optimize) {
          commandsCopy = JSON.parse(JSON.stringify(this.commands));
          commandsCopy = optimizeCommands(commandsCopy);
        }
        const flipY = options.flipY;
        let flipYBase = options.flipYBase;
        if (flipY === true && flipYBase === void 0) {
          const tempPath = new Path();
          tempPath.extend(commandsCopy);
          const boundingBox = tempPath.getBoundingBox();
          flipYBase = boundingBox.y1 + boundingBox.y2;
        }
        let d = "";
        for (let i = 0; i < commandsCopy.length; i += 1) {
          const cmd = commandsCopy[i];
          if (cmd.type === "M") {
            d += "M" + packValues(
              cmd.x,
              flipY ? flipYBase - cmd.y : cmd.y
            );
          } else if (cmd.type === "L") {
            d += "L" + packValues(
              cmd.x,
              flipY ? flipYBase - cmd.y : cmd.y
            );
          } else if (cmd.type === "C") {
            d += "C" + packValues(
              cmd.x1,
              flipY ? flipYBase - cmd.y1 : cmd.y1,
              cmd.x2,
              flipY ? flipYBase - cmd.y2 : cmd.y2,
              cmd.x,
              flipY ? flipYBase - cmd.y : cmd.y
            );
          } else if (cmd.type === "Q") {
            d += "Q" + packValues(
              cmd.x1,
              flipY ? flipYBase - cmd.y1 : cmd.y1,
              cmd.x,
              flipY ? flipYBase - cmd.y : cmd.y
            );
          } else if (cmd.type === "Z") {
            d += "Z";
          }
        }
        return d;
      };
      Path.prototype.toSVG = function(options, pathData) {
        if (this._layers && this._layers.length) {
          console.warn("toSVG() does not support colr font layers yet");
        }
        if (this._image) {
          console.warn("toSVG() does not support SVG glyphs yet");
        }
        if (!pathData) {
          pathData = this.toPathData(options);
        }
        let svg = '<path d="';
        svg += pathData;
        svg += '"';
        if (this.fill !== void 0 && this.fill !== "black") {
          if (this.fill === null) {
            svg += ' fill="none"';
          } else {
            svg += ' fill="' + this.fill + '"';
          }
        }
        if (this.stroke) {
          svg += ' stroke="' + this.stroke + '" stroke-width="' + this.strokeWidth + '"';
        }
        svg += "/>";
        return svg;
      };
      Path.prototype.toDOMElement = function(options, pathData) {
        if (this._layers && this._layers.length) {
          console.warn("toDOMElement() does not support colr font layers yet");
        }
        if (!pathData) {
          pathData = this.toPathData(options);
        }
        const newPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        newPath.setAttribute("d", pathData);
        if (this.fill !== void 0 && this.fill !== "black") {
          if (this.fill === null) {
            newPath.setAttribute("fill", "none");
          } else {
            newPath.setAttribute("fill", this.fill);
          }
        }
        if (this.stroke) {
          newPath.setAttribute("stroke", this.stroke);
          newPath.setAttribute("stroke-width", this.strokeWidth);
        }
        return newPath;
      };
      var path_default = Path;
      function fail(message) {
        throw new Error(message);
      }
      function argument(predicate, message) {
        if (!predicate) {
          fail(message);
        }
      }
      var check_default = { fail, argument, assert: argument };
      var LIMIT16 = 32768;
      var LIMIT32 = 2147483648;
      var MIN_16_16 = -(1 << 15);
      var MAX_16_16 = (1 << 15) - 1 + 1 / (1 << 16);
      var decode = {};
      var encode = {};
      var sizeOf = {};
      function constant(v) {
        return function() {
          return v;
        };
      }
      encode.BYTE = function(v) {
        check_default.argument(v >= 0 && v <= 255, "Byte value should be between 0 and 255.");
        return [v];
      };
      sizeOf.BYTE = constant(1);
      encode.CHAR = function(v) {
        return [v.charCodeAt(0)];
      };
      sizeOf.CHAR = constant(1);
      encode.CHARARRAY = function(v) {
        if (v === null || typeof v === "undefined") {
          v = "";
          console.warn("CHARARRAY with undefined or null value encountered and treated as an empty string. This is probably caused by a missing glyph name.");
        }
        const b = [];
        for (let i = 0; i < v.length; i += 1) {
          b[i] = v.charCodeAt(i);
        }
        return b;
      };
      sizeOf.CHARARRAY = function(v) {
        if (typeof v === "undefined") {
          return 0;
        }
        return v.length;
      };
      encode.USHORT = function(v) {
        return [v >> 8 & 255, v & 255];
      };
      sizeOf.USHORT = constant(2);
      encode.SHORT = function(v) {
        if (v >= LIMIT16) {
          v = -(2 * LIMIT16 - v);
        }
        return [v >> 8 & 255, v & 255];
      };
      sizeOf.SHORT = constant(2);
      encode.UINT24 = function(v) {
        return [v >> 16 & 255, v >> 8 & 255, v & 255];
      };
      sizeOf.UINT24 = constant(3);
      encode.ULONG = function(v) {
        return [v >> 24 & 255, v >> 16 & 255, v >> 8 & 255, v & 255];
      };
      sizeOf.ULONG = constant(4);
      encode.LONG = function(v) {
        if (v >= LIMIT32) {
          v = -(2 * LIMIT32 - v);
        }
        return [v >> 24 & 255, v >> 16 & 255, v >> 8 & 255, v & 255];
      };
      sizeOf.LONG = constant(4);
      encode.FLOAT = function(v) {
        if (v > MAX_16_16 || v < MIN_16_16) {
          throw new Error(`Value ${v} is outside the range of representable values in 16.16 format`);
        }
        const fixedValue = Math.round(v * (1 << 16)) << 0;
        return encode.ULONG(fixedValue);
      };
      sizeOf.FLOAT = sizeOf.ULONG;
      encode.FIXED = encode.ULONG;
      sizeOf.FIXED = sizeOf.ULONG;
      encode.FWORD = encode.SHORT;
      sizeOf.FWORD = sizeOf.SHORT;
      encode.UFWORD = encode.USHORT;
      sizeOf.UFWORD = sizeOf.USHORT;
      encode.F2DOT14 = function(v) {
        return encode.USHORT(v * 16384);
      };
      sizeOf.F2DOT14 = sizeOf.USHORT;
      encode.LONGDATETIME = function(v) {
        return [0, 0, 0, 0, v >> 24 & 255, v >> 16 & 255, v >> 8 & 255, v & 255];
      };
      sizeOf.LONGDATETIME = constant(8);
      encode.TAG = function(v) {
        check_default.argument(v.length === 4, "Tag should be exactly 4 ASCII characters.");
        return [
          v.charCodeAt(0),
          v.charCodeAt(1),
          v.charCodeAt(2),
          v.charCodeAt(3)
        ];
      };
      sizeOf.TAG = constant(4);
      encode.Card8 = encode.BYTE;
      sizeOf.Card8 = sizeOf.BYTE;
      encode.Card16 = encode.USHORT;
      sizeOf.Card16 = sizeOf.USHORT;
      encode.OffSize = encode.BYTE;
      sizeOf.OffSize = sizeOf.BYTE;
      encode.SID = encode.USHORT;
      sizeOf.SID = sizeOf.USHORT;
      encode.NUMBER = function(v) {
        if (v >= -107 && v <= 107) {
          return [v + 139];
        } else if (v >= 108 && v <= 1131) {
          v = v - 108;
          return [(v >> 8) + 247, v & 255];
        } else if (v >= -1131 && v <= -108) {
          v = -v - 108;
          return [(v >> 8) + 251, v & 255];
        } else if (v >= -32768 && v <= 32767) {
          return encode.NUMBER16(v);
        } else {
          return encode.NUMBER32(v);
        }
      };
      sizeOf.NUMBER = function(v) {
        return encode.NUMBER(v).length;
      };
      encode.NUMBER16 = function(v) {
        return [28, v >> 8 & 255, v & 255];
      };
      sizeOf.NUMBER16 = constant(3);
      encode.NUMBER32 = function(v) {
        return [29, v >> 24 & 255, v >> 16 & 255, v >> 8 & 255, v & 255];
      };
      sizeOf.NUMBER32 = constant(5);
      encode.REAL = function(v) {
        let value = v.toString();
        const m = /\.(\d*?)(?:9{5,20}|0{5,20})\d{0,2}(?:e(.+)|$)/.exec(value);
        if (m) {
          const epsilon = parseFloat("1e" + ((m[2] ? +m[2] : 0) + m[1].length));
          value = (Math.round(v * epsilon) / epsilon).toString();
        }
        let nibbles = "";
        for (let i = 0, ii = value.length; i < ii; i += 1) {
          const c = value[i];
          if (c === "e") {
            nibbles += value[++i] === "-" ? "c" : "b";
          } else if (c === ".") {
            nibbles += "a";
          } else if (c === "-") {
            nibbles += "e";
          } else {
            nibbles += c;
          }
        }
        nibbles += nibbles.length & 1 ? "f" : "ff";
        const out2 = [30];
        for (let i = 0, ii = nibbles.length; i < ii; i += 2) {
          out2.push(parseInt(nibbles.substr(i, 2), 16));
        }
        return out2;
      };
      sizeOf.REAL = function(v) {
        return encode.REAL(v).length;
      };
      encode.NAME = encode.CHARARRAY;
      sizeOf.NAME = sizeOf.CHARARRAY;
      encode.STRING = encode.CHARARRAY;
      sizeOf.STRING = sizeOf.CHARARRAY;
      decode.UTF8 = function(data, offset, numBytes) {
        const codePoints = [];
        const numChars = numBytes;
        for (let j = 0; j < numChars; j++, offset += 1) {
          codePoints[j] = data.getUint8(offset);
        }
        return String.fromCharCode.apply(null, codePoints);
      };
      decode.UTF16 = function(data, offset, numBytes) {
        const codePoints = [];
        const numChars = numBytes / 2;
        for (let j = 0; j < numChars; j++, offset += 2) {
          codePoints[j] = data.getUint16(offset);
        }
        return String.fromCharCode.apply(null, codePoints);
      };
      encode.UTF16 = function(v) {
        const b = [];
        for (let i = 0; i < v.length; i += 1) {
          const codepoint = v.charCodeAt(i);
          b[b.length] = codepoint >> 8 & 255;
          b[b.length] = codepoint & 255;
        }
        return b;
      };
      sizeOf.UTF16 = function(v) {
        return v.length * 2;
      };
      var eightBitMacEncodings = {
        "x-mac-croatian": (
          // Python: 'mac_croatian'
          "\xC4\xC5\xC7\xC9\xD1\xD6\xDC\xE1\xE0\xE2\xE4\xE3\xE5\xE7\xE9\xE8\xEA\xEB\xED\xEC\xEE\xEF\xF1\xF3\xF2\xF4\xF6\xF5\xFA\xF9\xFB\xFC\u2020\xB0\xA2\xA3\xA7\u2022\xB6\xDF\xAE\u0160\u2122\xB4\xA8\u2260\u017D\xD8\u221E\xB1\u2264\u2265\u2206\xB5\u2202\u2211\u220F\u0161\u222B\xAA\xBA\u03A9\u017E\xF8\xBF\xA1\xAC\u221A\u0192\u2248\u0106\xAB\u010C\u2026\xA0\xC0\xC3\xD5\u0152\u0153\u0110\u2014\u201C\u201D\u2018\u2019\xF7\u25CA\uF8FF\xA9\u2044\u20AC\u2039\u203A\xC6\xBB\u2013\xB7\u201A\u201E\u2030\xC2\u0107\xC1\u010D\xC8\xCD\xCE\xCF\xCC\xD3\xD4\u0111\xD2\xDA\xDB\xD9\u0131\u02C6\u02DC\xAF\u03C0\xCB\u02DA\xB8\xCA\xE6\u02C7"
        ),
        "x-mac-cyrillic": (
          // Python: 'mac_cyrillic'
          "\u0410\u0411\u0412\u0413\u0414\u0415\u0416\u0417\u0418\u0419\u041A\u041B\u041C\u041D\u041E\u041F\u0420\u0421\u0422\u0423\u0424\u0425\u0426\u0427\u0428\u0429\u042A\u042B\u042C\u042D\u042E\u042F\u2020\xB0\u0490\xA3\xA7\u2022\xB6\u0406\xAE\xA9\u2122\u0402\u0452\u2260\u0403\u0453\u221E\xB1\u2264\u2265\u0456\xB5\u0491\u0408\u0404\u0454\u0407\u0457\u0409\u0459\u040A\u045A\u0458\u0405\xAC\u221A\u0192\u2248\u2206\xAB\xBB\u2026\xA0\u040B\u045B\u040C\u045C\u0455\u2013\u2014\u201C\u201D\u2018\u2019\xF7\u201E\u040E\u045E\u040F\u045F\u2116\u0401\u0451\u044F\u0430\u0431\u0432\u0433\u0434\u0435\u0436\u0437\u0438\u0439\u043A\u043B\u043C\u043D\u043E\u043F\u0440\u0441\u0442\u0443\u0444\u0445\u0446\u0447\u0448\u0449\u044A\u044B\u044C\u044D\u044E"
        ),
        "x-mac-gaelic": (
          // http://unicode.org/Public/MAPPINGS/VENDORS/APPLE/GAELIC.TXT
          "\xC4\xC5\xC7\xC9\xD1\xD6\xDC\xE1\xE0\xE2\xE4\xE3\xE5\xE7\xE9\xE8\xEA\xEB\xED\xEC\xEE\xEF\xF1\xF3\xF2\xF4\xF6\xF5\xFA\xF9\xFB\xFC\u2020\xB0\xA2\xA3\xA7\u2022\xB6\xDF\xAE\xA9\u2122\xB4\xA8\u2260\xC6\xD8\u1E02\xB1\u2264\u2265\u1E03\u010A\u010B\u1E0A\u1E0B\u1E1E\u1E1F\u0120\u0121\u1E40\xE6\xF8\u1E41\u1E56\u1E57\u027C\u0192\u017F\u1E60\xAB\xBB\u2026\xA0\xC0\xC3\xD5\u0152\u0153\u2013\u2014\u201C\u201D\u2018\u2019\u1E61\u1E9B\xFF\u0178\u1E6A\u20AC\u2039\u203A\u0176\u0177\u1E6B\xB7\u1EF2\u1EF3\u204A\xC2\xCA\xC1\xCB\xC8\xCD\xCE\xCF\xCC\xD3\xD4\u2663\xD2\xDA\xDB\xD9\u0131\xDD\xFD\u0174\u0175\u1E84\u1E85\u1E80\u1E81\u1E82\u1E83"
        ),
        "x-mac-greek": (
          // Python: 'mac_greek'
          "\xC4\xB9\xB2\xC9\xB3\xD6\xDC\u0385\xE0\xE2\xE4\u0384\xA8\xE7\xE9\xE8\xEA\xEB\xA3\u2122\xEE\xEF\u2022\xBD\u2030\xF4\xF6\xA6\u20AC\xF9\xFB\xFC\u2020\u0393\u0394\u0398\u039B\u039E\u03A0\xDF\xAE\xA9\u03A3\u03AA\xA7\u2260\xB0\xB7\u0391\xB1\u2264\u2265\xA5\u0392\u0395\u0396\u0397\u0399\u039A\u039C\u03A6\u03AB\u03A8\u03A9\u03AC\u039D\xAC\u039F\u03A1\u2248\u03A4\xAB\xBB\u2026\xA0\u03A5\u03A7\u0386\u0388\u0153\u2013\u2015\u201C\u201D\u2018\u2019\xF7\u0389\u038A\u038C\u038E\u03AD\u03AE\u03AF\u03CC\u038F\u03CD\u03B1\u03B2\u03C8\u03B4\u03B5\u03C6\u03B3\u03B7\u03B9\u03BE\u03BA\u03BB\u03BC\u03BD\u03BF\u03C0\u03CE\u03C1\u03C3\u03C4\u03B8\u03C9\u03C2\u03C7\u03C5\u03B6\u03CA\u03CB\u0390\u03B0\xAD"
        ),
        "x-mac-icelandic": (
          // Python: 'mac_iceland'
          "\xC4\xC5\xC7\xC9\xD1\xD6\xDC\xE1\xE0\xE2\xE4\xE3\xE5\xE7\xE9\xE8\xEA\xEB\xED\xEC\xEE\xEF\xF1\xF3\xF2\xF4\xF6\xF5\xFA\xF9\xFB\xFC\xDD\xB0\xA2\xA3\xA7\u2022\xB6\xDF\xAE\xA9\u2122\xB4\xA8\u2260\xC6\xD8\u221E\xB1\u2264\u2265\xA5\xB5\u2202\u2211\u220F\u03C0\u222B\xAA\xBA\u03A9\xE6\xF8\xBF\xA1\xAC\u221A\u0192\u2248\u2206\xAB\xBB\u2026\xA0\xC0\xC3\xD5\u0152\u0153\u2013\u2014\u201C\u201D\u2018\u2019\xF7\u25CA\xFF\u0178\u2044\u20AC\xD0\xF0\xDE\xFE\xFD\xB7\u201A\u201E\u2030\xC2\xCA\xC1\xCB\xC8\xCD\xCE\xCF\xCC\xD3\xD4\uF8FF\xD2\xDA\xDB\xD9\u0131\u02C6\u02DC\xAF\u02D8\u02D9\u02DA\xB8\u02DD\u02DB\u02C7"
        ),
        "x-mac-inuit": (
          // http://unicode.org/Public/MAPPINGS/VENDORS/APPLE/INUIT.TXT
          "\u1403\u1404\u1405\u1406\u140A\u140B\u1431\u1432\u1433\u1434\u1438\u1439\u1449\u144E\u144F\u1450\u1451\u1455\u1456\u1466\u146D\u146E\u146F\u1470\u1472\u1473\u1483\u148B\u148C\u148D\u148E\u1490\u1491\xB0\u14A1\u14A5\u14A6\u2022\xB6\u14A7\xAE\xA9\u2122\u14A8\u14AA\u14AB\u14BB\u14C2\u14C3\u14C4\u14C5\u14C7\u14C8\u14D0\u14EF\u14F0\u14F1\u14F2\u14F4\u14F5\u1505\u14D5\u14D6\u14D7\u14D8\u14DA\u14DB\u14EA\u1528\u1529\u152A\u152B\u152D\u2026\xA0\u152E\u153E\u1555\u1556\u1557\u2013\u2014\u201C\u201D\u2018\u2019\u1558\u1559\u155A\u155D\u1546\u1547\u1548\u1549\u154B\u154C\u1550\u157F\u1580\u1581\u1582\u1583\u1584\u1585\u158F\u1590\u1591\u1592\u1593\u1594\u1595\u1671\u1672\u1673\u1674\u1675\u1676\u1596\u15A0\u15A1\u15A2\u15A3\u15A4\u15A5\u15A6\u157C\u0141\u0142"
        ),
        "x-mac-ce": (
          // Python: 'mac_latin2'
          "\xC4\u0100\u0101\xC9\u0104\xD6\xDC\xE1\u0105\u010C\xE4\u010D\u0106\u0107\xE9\u0179\u017A\u010E\xED\u010F\u0112\u0113\u0116\xF3\u0117\xF4\xF6\xF5\xFA\u011A\u011B\xFC\u2020\xB0\u0118\xA3\xA7\u2022\xB6\xDF\xAE\xA9\u2122\u0119\xA8\u2260\u0123\u012E\u012F\u012A\u2264\u2265\u012B\u0136\u2202\u2211\u0142\u013B\u013C\u013D\u013E\u0139\u013A\u0145\u0146\u0143\xAC\u221A\u0144\u0147\u2206\xAB\xBB\u2026\xA0\u0148\u0150\xD5\u0151\u014C\u2013\u2014\u201C\u201D\u2018\u2019\xF7\u25CA\u014D\u0154\u0155\u0158\u2039\u203A\u0159\u0156\u0157\u0160\u201A\u201E\u0161\u015A\u015B\xC1\u0164\u0165\xCD\u017D\u017E\u016A\xD3\xD4\u016B\u016E\xDA\u016F\u0170\u0171\u0172\u0173\xDD\xFD\u0137\u017B\u0141\u017C\u0122\u02C7"
        ),
        macintosh: (
          // Python: 'mac_roman'
          "\xC4\xC5\xC7\xC9\xD1\xD6\xDC\xE1\xE0\xE2\xE4\xE3\xE5\xE7\xE9\xE8\xEA\xEB\xED\xEC\xEE\xEF\xF1\xF3\xF2\xF4\xF6\xF5\xFA\xF9\xFB\xFC\u2020\xB0\xA2\xA3\xA7\u2022\xB6\xDF\xAE\xA9\u2122\xB4\xA8\u2260\xC6\xD8\u221E\xB1\u2264\u2265\xA5\xB5\u2202\u2211\u220F\u03C0\u222B\xAA\xBA\u03A9\xE6\xF8\xBF\xA1\xAC\u221A\u0192\u2248\u2206\xAB\xBB\u2026\xA0\xC0\xC3\xD5\u0152\u0153\u2013\u2014\u201C\u201D\u2018\u2019\xF7\u25CA\xFF\u0178\u2044\u20AC\u2039\u203A\uFB01\uFB02\u2021\xB7\u201A\u201E\u2030\xC2\xCA\xC1\xCB\xC8\xCD\xCE\xCF\xCC\xD3\xD4\uF8FF\xD2\xDA\xDB\xD9\u0131\u02C6\u02DC\xAF\u02D8\u02D9\u02DA\xB8\u02DD\u02DB\u02C7"
        ),
        "x-mac-romanian": (
          // Python: 'mac_romanian'
          "\xC4\xC5\xC7\xC9\xD1\xD6\xDC\xE1\xE0\xE2\xE4\xE3\xE5\xE7\xE9\xE8\xEA\xEB\xED\xEC\xEE\xEF\xF1\xF3\xF2\xF4\xF6\xF5\xFA\xF9\xFB\xFC\u2020\xB0\xA2\xA3\xA7\u2022\xB6\xDF\xAE\xA9\u2122\xB4\xA8\u2260\u0102\u0218\u221E\xB1\u2264\u2265\xA5\xB5\u2202\u2211\u220F\u03C0\u222B\xAA\xBA\u03A9\u0103\u0219\xBF\xA1\xAC\u221A\u0192\u2248\u2206\xAB\xBB\u2026\xA0\xC0\xC3\xD5\u0152\u0153\u2013\u2014\u201C\u201D\u2018\u2019\xF7\u25CA\xFF\u0178\u2044\u20AC\u2039\u203A\u021A\u021B\u2021\xB7\u201A\u201E\u2030\xC2\xCA\xC1\xCB\xC8\xCD\xCE\xCF\xCC\xD3\xD4\uF8FF\xD2\xDA\xDB\xD9\u0131\u02C6\u02DC\xAF\u02D8\u02D9\u02DA\xB8\u02DD\u02DB\u02C7"
        ),
        "x-mac-turkish": (
          // Python: 'mac_turkish'
          "\xC4\xC5\xC7\xC9\xD1\xD6\xDC\xE1\xE0\xE2\xE4\xE3\xE5\xE7\xE9\xE8\xEA\xEB\xED\xEC\xEE\xEF\xF1\xF3\xF2\xF4\xF6\xF5\xFA\xF9\xFB\xFC\u2020\xB0\xA2\xA3\xA7\u2022\xB6\xDF\xAE\xA9\u2122\xB4\xA8\u2260\xC6\xD8\u221E\xB1\u2264\u2265\xA5\xB5\u2202\u2211\u220F\u03C0\u222B\xAA\xBA\u03A9\xE6\xF8\xBF\xA1\xAC\u221A\u0192\u2248\u2206\xAB\xBB\u2026\xA0\xC0\xC3\xD5\u0152\u0153\u2013\u2014\u201C\u201D\u2018\u2019\xF7\u25CA\xFF\u0178\u011E\u011F\u0130\u0131\u015E\u015F\u2021\xB7\u201A\u201E\u2030\xC2\xCA\xC1\xCB\xC8\xCD\xCE\xCF\xCC\xD3\xD4\uF8FF\xD2\xDA\xDB\xD9\uF8A0\u02C6\u02DC\xAF\u02D8\u02D9\u02DA\xB8\u02DD\u02DB\u02C7"
        )
      };
      decode.MACSTRING = function(dataView, offset, dataLength, encoding) {
        const table = eightBitMacEncodings[encoding];
        if (table === void 0) {
          return void 0;
        }
        let result = "";
        for (let i = 0; i < dataLength; i++) {
          const c = dataView.getUint8(offset + i);
          if (c <= 127) {
            result += String.fromCharCode(c);
          } else {
            result += table[c & 127];
          }
        }
        return result;
      };
      var macEncodingTableCache = typeof WeakMap === "function" && /* @__PURE__ */ new WeakMap();
      var macEncodingCacheKeys;
      var getMacEncodingTable = function(encoding) {
        if (!macEncodingCacheKeys) {
          macEncodingCacheKeys = {};
          for (let e in eightBitMacEncodings) {
            macEncodingCacheKeys[e] = new String(e);
          }
        }
        const cacheKey = macEncodingCacheKeys[encoding];
        if (cacheKey === void 0) {
          return void 0;
        }
        if (macEncodingTableCache) {
          const cachedTable = macEncodingTableCache.get(cacheKey);
          if (cachedTable !== void 0) {
            return cachedTable;
          }
        }
        const decodingTable = eightBitMacEncodings[encoding];
        if (decodingTable === void 0) {
          return void 0;
        }
        const encodingTable = {};
        for (let i = 0; i < decodingTable.length; i++) {
          encodingTable[decodingTable.charCodeAt(i)] = i + 128;
        }
        if (macEncodingTableCache) {
          macEncodingTableCache.set(cacheKey, encodingTable);
        }
        return encodingTable;
      };
      encode.MACSTRING = function(str, encoding) {
        const table = getMacEncodingTable(encoding);
        if (table === void 0) {
          return void 0;
        }
        const result = [];
        for (let i = 0; i < str.length; i++) {
          let c = str.charCodeAt(i);
          if (c >= 128) {
            c = table[c];
            if (c === void 0) {
              return void 0;
            }
          }
          result[i] = c;
        }
        return result;
      };
      sizeOf.MACSTRING = function(str, encoding) {
        const b = encode.MACSTRING(str, encoding);
        if (b !== void 0) {
          return b.length;
        } else {
          return 0;
        }
      };
      function isByteEncodable(value) {
        return value >= -128 && value <= 127;
      }
      function encodeVarDeltaRunAsZeroes(deltas, pos, result) {
        let runLength = 0;
        const numDeltas = deltas.length;
        while (pos < numDeltas && runLength < 64 && deltas[pos] === 0) {
          ++pos;
          ++runLength;
        }
        result.push(128 | runLength - 1);
        return pos;
      }
      function encodeVarDeltaRunAsBytes(deltas, offset, result) {
        let runLength = 0;
        const numDeltas = deltas.length;
        let pos = offset;
        while (pos < numDeltas && runLength < 64) {
          const value = deltas[pos];
          if (!isByteEncodable(value)) {
            break;
          }
          if (value === 0 && pos + 1 < numDeltas && deltas[pos + 1] === 0) {
            break;
          }
          ++pos;
          ++runLength;
        }
        result.push(runLength - 1);
        for (let i = offset; i < pos; ++i) {
          result.push(deltas[i] + 256 & 255);
        }
        return pos;
      }
      function encodeVarDeltaRunAsWords(deltas, offset, result) {
        let runLength = 0;
        const numDeltas = deltas.length;
        let pos = offset;
        while (pos < numDeltas && runLength < 64) {
          const value = deltas[pos];
          if (value === 0) {
            break;
          }
          if (isByteEncodable(value) && pos + 1 < numDeltas && isByteEncodable(deltas[pos + 1])) {
            break;
          }
          ++pos;
          ++runLength;
        }
        result.push(64 | runLength - 1);
        for (let i = offset; i < pos; ++i) {
          const val = deltas[i];
          result.push(val + 65536 >> 8 & 255, val + 256 & 255);
        }
        return pos;
      }
      encode.VARDELTAS = function(deltas) {
        let pos = 0;
        const result = [];
        while (pos < deltas.length) {
          const value = deltas[pos];
          if (value === 0) {
            pos = encodeVarDeltaRunAsZeroes(deltas, pos, result);
          } else if (value >= -128 && value <= 127) {
            pos = encodeVarDeltaRunAsBytes(deltas, pos, result);
          } else {
            pos = encodeVarDeltaRunAsWords(deltas, pos, result);
          }
        }
        return result;
      };
      encode.INDEX = function(l) {
        let offset = 1;
        const offsets = [offset];
        const data = [];
        for (let i = 0; i < l.length; i += 1) {
          const v = encode.OBJECT(l[i]);
          Array.prototype.push.apply(data, v);
          offset += v.length;
          offsets.push(offset);
        }
        if (data.length === 0) {
          return [0, 0];
        }
        const encodedOffsets = [];
        const offSize = 1 + Math.floor(Math.log(offset) / Math.log(2)) / 8 | 0;
        const offsetEncoder = [void 0, encode.BYTE, encode.USHORT, encode.UINT24, encode.ULONG][offSize];
        for (let i = 0; i < offsets.length; i += 1) {
          const encodedOffset = offsetEncoder(offsets[i]);
          Array.prototype.push.apply(encodedOffsets, encodedOffset);
        }
        return Array.prototype.concat(
          encode.Card16(l.length),
          encode.OffSize(offSize),
          encodedOffsets,
          data
        );
      };
      sizeOf.INDEX = function(v) {
        return encode.INDEX(v).length;
      };
      encode.DICT = function(m) {
        let d = [];
        const keys = Object.keys(m);
        const length = keys.length;
        for (let i = 0; i < length; i += 1) {
          const k = parseInt(keys[i], 0);
          const v = m[k];
          const enc1 = encode.OPERAND(v.value, v.type);
          const enc2 = encode.OPERATOR(k);
          for (let j = 0; j < enc1.length; j++) {
            d.push(enc1[j]);
          }
          for (let j = 0; j < enc2.length; j++) {
            d.push(enc2[j]);
          }
        }
        return d;
      };
      sizeOf.DICT = function(m) {
        return encode.DICT(m).length;
      };
      encode.OPERATOR = function(v) {
        if (v < 1200) {
          return [v];
        } else {
          return [12, v - 1200];
        }
      };
      encode.OPERAND = function(v, type) {
        let d = [];
        if (Array.isArray(type)) {
          for (let i = 0; i < type.length; i += 1) {
            check_default.argument(v.length === type.length, "Not enough arguments given for type" + type);
            const enc1 = encode.OPERAND(v[i], type[i]);
            for (let j = 0; j < enc1.length; j++) {
              d.push(enc1[j]);
            }
          }
        } else {
          if (type === "SID") {
            const enc1 = encode.NUMBER(v);
            for (let j = 0; j < enc1.length; j++) {
              d.push(enc1[j]);
            }
          } else if (type === "offset") {
            const enc1 = encode.NUMBER32(v);
            for (let j = 0; j < enc1.length; j++) {
              d.push(enc1[j]);
            }
          } else if (type === "number") {
            const enc1 = encode.NUMBER(v);
            for (let j = 0; j < enc1.length; j++) {
              d.push(enc1[j]);
            }
          } else if (type === "real") {
            const enc1 = encode.REAL(v);
            for (let j = 0; j < enc1.length; j++) {
              d.push(enc1[j]);
            }
          } else {
            throw new Error("Unknown operand type " + type);
          }
        }
        return d;
      };
      encode.OP = encode.BYTE;
      sizeOf.OP = sizeOf.BYTE;
      var wmm = typeof WeakMap === "function" && /* @__PURE__ */ new WeakMap();
      encode.CHARSTRING = function(ops) {
        if (wmm) {
          const cachedValue = wmm.get(ops);
          if (cachedValue !== void 0) {
            return cachedValue;
          }
        }
        let d = [];
        const length = ops.length;
        for (let i = 0; i < length; i += 1) {
          const op = ops[i];
          const enc1 = encode[op.type](op.value);
          for (let j = 0; j < enc1.length; j++) {
            d.push(enc1[j]);
          }
        }
        if (wmm) {
          wmm.set(ops, d);
        }
        return d;
      };
      sizeOf.CHARSTRING = function(ops) {
        return encode.CHARSTRING(ops).length;
      };
      encode.OBJECT = function(v) {
        const encodingFunction = encode[v.type];
        check_default.argument(encodingFunction !== void 0, "No encoding function for type " + v.type);
        return encodingFunction(v.value);
      };
      sizeOf.OBJECT = function(v) {
        const sizeOfFunction = sizeOf[v.type];
        check_default.argument(sizeOfFunction !== void 0, "No sizeOf function for type " + v.type);
        return sizeOfFunction(v.value);
      };
      encode.TABLE = function(table) {
        let d = [];
        const length = (table.fields || []).length;
        const subtables = [];
        const subtableOffsets = [];
        for (let i = 0; i < length; i += 1) {
          const field = table.fields[i];
          const encodingFunction = encode[field.type];
          check_default.argument(encodingFunction !== void 0, "No encoding function for field type " + field.type + " (" + field.name + ")");
          let value = table[field.name];
          if (value === void 0) {
            value = field.value;
          }
          const bytes = encodingFunction(value);
          if (field.type === "TABLE") {
            if (value.fields !== null) {
              subtableOffsets.push(d.length);
              subtables.push(bytes);
            }
            d.push(...[0, 0]);
          } else {
            for (let j = 0; j < bytes.length; j++) {
              d.push(bytes[j]);
            }
          }
        }
        for (let i = 0; i < subtables.length; i += 1) {
          const o = subtableOffsets[i];
          const offset = d.length;
          check_default.argument(offset < 65536, "Table " + table.tableName + " too big.");
          d[o] = offset >> 8;
          d[o + 1] = offset & 255;
          for (let j = 0; j < subtables[i].length; j++) {
            d.push(subtables[i][j]);
          }
        }
        return d;
      };
      sizeOf.TABLE = function(table) {
        let numBytes = 0;
        const length = (table.fields || []).length;
        for (let i = 0; i < length; i += 1) {
          const field = table.fields[i];
          const sizeOfFunction = sizeOf[field.type];
          check_default.argument(sizeOfFunction !== void 0, "No sizeOf function for field type " + field.type + " (" + field.name + ")");
          let value = table[field.name];
          if (value === void 0) {
            value = field.value;
          }
          numBytes += sizeOfFunction(value);
          if (field.type === "TABLE") {
            numBytes += 2;
          }
        }
        return numBytes;
      };
      encode.RECORD = encode.TABLE;
      sizeOf.RECORD = sizeOf.TABLE;
      encode.LITERAL = function(v) {
        return v;
      };
      sizeOf.LITERAL = function(v) {
        return v.length;
      };
      function Table(tableName, fields, options) {
        if (fields && fields.length) {
          for (let i = 0; i < fields.length; i += 1) {
            const field = fields[i];
            this[field.name] = field.value;
          }
        }
        this.tableName = tableName;
        this.fields = fields;
        if (options) {
          const optionKeys = Object.keys(options);
          for (let i = 0; i < optionKeys.length; i += 1) {
            const k = optionKeys[i];
            const v = options[k];
            if (this[k] !== void 0) {
              this[k] = v;
            }
          }
        }
      }
      Table.prototype.encode = function() {
        return encode.TABLE(this);
      };
      Table.prototype.sizeOf = function() {
        return sizeOf.TABLE(this);
      };
      function ushortList(itemName, list, count) {
        if (count === void 0) {
          count = list.length;
        }
        const fields = new Array(list.length + 1);
        fields[0] = { name: itemName + "Count", type: "USHORT", value: count };
        for (let i = 0; i < list.length; i++) {
          fields[i + 1] = { name: itemName + i, type: "USHORT", value: list[i] };
        }
        return fields;
      }
      function tableList(itemName, records, itemCallback) {
        const count = records.length;
        const fields = new Array(count + 1);
        fields[0] = { name: itemName + "Count", type: "USHORT", value: count };
        for (let i = 0; i < count; i++) {
          fields[i + 1] = { name: itemName + i, type: "TABLE", value: itemCallback(records[i], i) };
        }
        return fields;
      }
      function recordList(itemName, records, itemCallback) {
        const count = records.length;
        let fields = [];
        fields[0] = { name: itemName + "Count", type: "USHORT", value: count };
        for (let i = 0; i < count; i++) {
          fields = fields.concat(itemCallback(records[i], i));
        }
        return fields;
      }
      function Coverage(coverageTable) {
        if (coverageTable.format === 1) {
          Table.call(
            this,
            "coverageTable",
            [{ name: "coverageFormat", type: "USHORT", value: 1 }].concat(ushortList("glyph", coverageTable.glyphs))
          );
        } else if (coverageTable.format === 2) {
          Table.call(
            this,
            "coverageTable",
            [{ name: "coverageFormat", type: "USHORT", value: 2 }].concat(recordList("rangeRecord", coverageTable.ranges, function(RangeRecord, i) {
              return [
                { name: "startGlyphID" + i, type: "USHORT", value: RangeRecord.start },
                { name: "endGlyphID" + i, type: "USHORT", value: RangeRecord.end },
                { name: "startCoverageIndex" + i, type: "USHORT", value: RangeRecord.index }
              ];
            }))
          );
        } else {
          check_default.assert(false, "Coverage format must be 1 or 2.");
        }
      }
      Coverage.prototype = Object.create(Table.prototype);
      Coverage.prototype.constructor = Coverage;
      function ScriptList(scriptListTable) {
        Table.call(
          this,
          "scriptListTable",
          recordList("scriptRecord", scriptListTable, function(scriptRecord, i) {
            const script = scriptRecord.script;
            let defaultLangSys = script.defaultLangSys;
            check_default.assert(!!defaultLangSys, "Unable to write GSUB: script " + scriptRecord.tag + " has no default language system.");
            return [
              { name: "scriptTag" + i, type: "TAG", value: scriptRecord.tag },
              { name: "script" + i, type: "TABLE", value: new Table("scriptTable", [
                { name: "defaultLangSys", type: "TABLE", value: new Table("defaultLangSys", [
                  { name: "lookupOrder", type: "USHORT", value: 0 },
                  { name: "reqFeatureIndex", type: "USHORT", value: defaultLangSys.reqFeatureIndex }
                ].concat(ushortList("featureIndex", defaultLangSys.featureIndexes))) }
              ].concat(recordList("langSys", script.langSysRecords, function(langSysRecord, i2) {
                const langSys = langSysRecord.langSys;
                return [
                  { name: "langSysTag" + i2, type: "TAG", value: langSysRecord.tag },
                  { name: "langSys" + i2, type: "TABLE", value: new Table("langSys", [
                    { name: "lookupOrder", type: "USHORT", value: 0 },
                    { name: "reqFeatureIndex", type: "USHORT", value: langSys.reqFeatureIndex }
                  ].concat(ushortList("featureIndex", langSys.featureIndexes))) }
                ];
              }))) }
            ];
          })
        );
      }
      ScriptList.prototype = Object.create(Table.prototype);
      ScriptList.prototype.constructor = ScriptList;
      function FeatureList(featureListTable) {
        Table.call(
          this,
          "featureListTable",
          recordList("featureRecord", featureListTable, function(featureRecord, i) {
            const feature = featureRecord.feature;
            return [
              { name: "featureTag" + i, type: "TAG", value: featureRecord.tag },
              { name: "feature" + i, type: "TABLE", value: new Table("featureTable", [
                { name: "featureParams", type: "USHORT", value: feature.featureParams }
              ].concat(ushortList("lookupListIndex", feature.lookupListIndexes))) }
            ];
          })
        );
      }
      FeatureList.prototype = Object.create(Table.prototype);
      FeatureList.prototype.constructor = FeatureList;
      function LookupList(lookupListTable, subtableMakers3) {
        Table.call(this, "lookupListTable", tableList("lookup", lookupListTable, function(lookupTable) {
          let subtableCallback = subtableMakers3[lookupTable.lookupType];
          check_default.assert(!!subtableCallback, "Unable to write GSUB lookup type " + lookupTable.lookupType + " tables.");
          return new Table("lookupTable", [
            { name: "lookupType", type: "USHORT", value: lookupTable.lookupType },
            { name: "lookupFlag", type: "USHORT", value: lookupTable.lookupFlag }
          ].concat(tableList("subtable", lookupTable.subtables, subtableCallback)));
        }));
      }
      LookupList.prototype = Object.create(Table.prototype);
      LookupList.prototype.constructor = LookupList;
      function ClassDef(classDefTable) {
        if (classDefTable.format === 1) {
          Table.call(
            this,
            "classDefTable",
            [
              { name: "classFormat", type: "USHORT", value: 1 },
              { name: "startGlyphID", type: "USHORT", value: classDefTable.startGlyph }
            ].concat(ushortList("glyph", classDefTable.classes))
          );
        } else if (classDefTable.format === 2) {
          Table.call(
            this,
            "classDefTable",
            [{ name: "classFormat", type: "USHORT", value: 2 }].concat(recordList("rangeRecord", classDefTable.ranges, function(RangeRecord, i) {
              return [
                { name: "startGlyphID" + i, type: "USHORT", value: RangeRecord.start },
                { name: "endGlyphID" + i, type: "USHORT", value: RangeRecord.end },
                { name: "class" + i, type: "USHORT", value: RangeRecord.classId }
              ];
            }))
          );
        } else {
          check_default.assert(false, "Class format must be 1 or 2.");
        }
      }
      ClassDef.prototype = Object.create(Table.prototype);
      ClassDef.prototype.constructor = ClassDef;
      var table_default = {
        Table,
        Record: Table,
        Coverage,
        ClassDef,
        ScriptList,
        FeatureList,
        LookupList,
        ushortList,
        tableList,
        recordList
      };
      function getByte(dataView, offset) {
        return dataView.getUint8(offset);
      }
      function getUShort(dataView, offset) {
        return dataView.getUint16(offset, false);
      }
      function getShort(dataView, offset) {
        return dataView.getInt16(offset, false);
      }
      function getUInt24(dataView, offset) {
        return (dataView.getUint16(offset) << 8) + dataView.getUint8(offset + 2);
      }
      function getULong(dataView, offset) {
        return dataView.getUint32(offset, false);
      }
      function getLong(dataView, offset) {
        return dataView.getInt32(offset, false);
      }
      function getFixed(dataView, offset) {
        const decimal = dataView.getInt16(offset, false);
        const fraction = dataView.getUint16(offset + 2, false);
        return decimal + fraction / 65535;
      }
      function getTag(dataView, offset) {
        let tag = "";
        for (let i = offset; i < offset + 4; i += 1) {
          tag += String.fromCharCode(dataView.getInt8(i));
        }
        return tag;
      }
      function getOffset(dataView, offset, offSize) {
        let v = 0;
        for (let i = 0; i < offSize; i += 1) {
          v <<= 8;
          v += dataView.getUint8(offset + i);
        }
        return v;
      }
      function getBytes(dataView, startOffset, endOffset) {
        const bytes = [];
        for (let i = startOffset; i < endOffset; i += 1) {
          bytes.push(dataView.getUint8(i));
        }
        return bytes;
      }
      function bytesToString(bytes) {
        let s = "";
        for (let i = 0; i < bytes.length; i += 1) {
          s += String.fromCharCode(bytes[i]);
        }
        return s;
      }
      var typeOffsets = {
        byte: 1,
        uShort: 2,
        f2dot14: 2,
        short: 2,
        uInt24: 3,
        uLong: 4,
        fixed: 4,
        longDateTime: 8,
        tag: 4
      };
      var masks = {
        LONG_WORDS: 32768,
        WORD_DELTA_COUNT_MASK: 32767,
        SHARED_POINT_NUMBERS: 32768,
        COUNT_MASK: 4095,
        EMBEDDED_PEAK_TUPLE: 32768,
        INTERMEDIATE_REGION: 16384,
        PRIVATE_POINT_NUMBERS: 8192,
        TUPLE_INDEX_MASK: 4095,
        POINTS_ARE_WORDS: 128,
        POINT_RUN_COUNT_MASK: 127,
        DELTAS_ARE_ZERO: 128,
        DELTAS_ARE_WORDS: 64,
        DELTA_RUN_COUNT_MASK: 63,
        INNER_INDEX_BIT_COUNT_MASK: 15,
        MAP_ENTRY_SIZE_MASK: 48
      };
      function Parser(data, offset) {
        this.data = data;
        this.offset = offset;
        this.relativeOffset = 0;
      }
      Parser.prototype.parseByte = function() {
        const v = this.data.getUint8(this.offset + this.relativeOffset);
        this.relativeOffset += 1;
        return v;
      };
      Parser.prototype.parseChar = function() {
        const v = this.data.getInt8(this.offset + this.relativeOffset);
        this.relativeOffset += 1;
        return v;
      };
      Parser.prototype.parseCard8 = Parser.prototype.parseByte;
      Parser.prototype.parseUShort = function() {
        const v = this.data.getUint16(this.offset + this.relativeOffset);
        this.relativeOffset += 2;
        return v;
      };
      Parser.prototype.parseCard16 = Parser.prototype.parseUShort;
      Parser.prototype.parseSID = Parser.prototype.parseUShort;
      Parser.prototype.parseOffset16 = Parser.prototype.parseUShort;
      Parser.prototype.parseShort = function() {
        const v = this.data.getInt16(this.offset + this.relativeOffset);
        this.relativeOffset += 2;
        return v;
      };
      Parser.prototype.parseF2Dot14 = function() {
        const v = this.data.getInt16(this.offset + this.relativeOffset) / 16384;
        this.relativeOffset += 2;
        return v;
      };
      Parser.prototype.parseUInt24 = function() {
        const v = getUInt24(this.data, this.offset + this.relativeOffset);
        this.relativeOffset += 3;
        return v;
      };
      Parser.prototype.parseULong = function() {
        const v = getULong(this.data, this.offset + this.relativeOffset);
        this.relativeOffset += 4;
        return v;
      };
      Parser.prototype.parseLong = function() {
        const v = getLong(this.data, this.offset + this.relativeOffset);
        this.relativeOffset += 4;
        return v;
      };
      Parser.prototype.parseOffset32 = Parser.prototype.parseULong;
      Parser.prototype.parseFixed = function() {
        const v = getFixed(this.data, this.offset + this.relativeOffset);
        this.relativeOffset += 4;
        return v;
      };
      Parser.prototype.parseString = function(length) {
        const dataView = this.data;
        const offset = this.offset + this.relativeOffset;
        let string = "";
        this.relativeOffset += length;
        for (let i = 0; i < length; i++) {
          string += String.fromCharCode(dataView.getUint8(offset + i));
        }
        return string;
      };
      Parser.prototype.parseTag = function() {
        return this.parseString(4);
      };
      Parser.prototype.parseLongDateTime = function() {
        let v = getULong(this.data, this.offset + this.relativeOffset + 4);
        v -= 2082844800;
        this.relativeOffset += 8;
        return v;
      };
      Parser.prototype.parseVersion = function(minorBase) {
        const major = getUShort(this.data, this.offset + this.relativeOffset);
        const minor = getUShort(this.data, this.offset + this.relativeOffset + 2);
        this.relativeOffset += 4;
        if (minorBase === void 0) minorBase = 4096;
        return major + minor / minorBase / 10;
      };
      Parser.prototype.skip = function(type, amount) {
        if (amount === void 0) {
          amount = 1;
        }
        this.relativeOffset += typeOffsets[type] * amount;
      };
      Parser.prototype.parseULongList = function(count) {
        if (count === void 0) {
          count = this.parseULong();
        }
        const offsets = new Array(count);
        const dataView = this.data;
        let offset = this.offset + this.relativeOffset;
        for (let i = 0; i < count; i++) {
          offsets[i] = dataView.getUint32(offset);
          offset += 4;
        }
        this.relativeOffset += count * 4;
        return offsets;
      };
      Parser.prototype.parseOffset16List = Parser.prototype.parseUShortList = function(count) {
        if (count === void 0) {
          count = this.parseUShort();
        }
        const offsets = new Array(count);
        const dataView = this.data;
        let offset = this.offset + this.relativeOffset;
        for (let i = 0; i < count; i++) {
          offsets[i] = dataView.getUint16(offset);
          offset += 2;
        }
        this.relativeOffset += count * 2;
        return offsets;
      };
      Parser.prototype.parseShortList = function(count) {
        const list = new Array(count);
        const dataView = this.data;
        let offset = this.offset + this.relativeOffset;
        for (let i = 0; i < count; i++) {
          list[i] = dataView.getInt16(offset);
          offset += 2;
        }
        this.relativeOffset += count * 2;
        return list;
      };
      Parser.prototype.parseByteList = function(count) {
        const list = new Array(count);
        const dataView = this.data;
        let offset = this.offset + this.relativeOffset;
        for (let i = 0; i < count; i++) {
          list[i] = dataView.getUint8(offset++);
        }
        this.relativeOffset += count;
        return list;
      };
      Parser.prototype.parseList = function(count, itemCallback) {
        if (!itemCallback) {
          itemCallback = count;
          count = this.parseUShort();
        }
        const list = new Array(count);
        for (let i = 0; i < count; i++) {
          list[i] = itemCallback.call(this);
        }
        return list;
      };
      Parser.prototype.parseList32 = function(count, itemCallback) {
        if (!itemCallback) {
          itemCallback = count;
          count = this.parseULong();
        }
        const list = new Array(count);
        for (let i = 0; i < count; i++) {
          list[i] = itemCallback.call(this);
        }
        return list;
      };
      Parser.prototype.parseRecordList = function(count, recordDescription) {
        if (!recordDescription) {
          recordDescription = count;
          count = this.parseUShort();
        }
        const records = new Array(count);
        const fields = Object.keys(recordDescription);
        for (let i = 0; i < count; i++) {
          const rec = {};
          for (let j = 0; j < fields.length; j++) {
            const fieldName = fields[j];
            const fieldType = recordDescription[fieldName];
            rec[fieldName] = fieldType.call(this);
          }
          records[i] = rec;
        }
        return records;
      };
      Parser.prototype.parseRecordList32 = function(count, recordDescription) {
        if (!recordDescription) {
          recordDescription = count;
          count = this.parseULong();
        }
        const records = new Array(count);
        const fields = Object.keys(recordDescription);
        for (let i = 0; i < count; i++) {
          const rec = {};
          for (let j = 0; j < fields.length; j++) {
            const fieldName = fields[j];
            const fieldType = recordDescription[fieldName];
            rec[fieldName] = fieldType.call(this);
          }
          records[i] = rec;
        }
        return records;
      };
      Parser.prototype.parseTupleRecords = function(tupleCount, axisCount) {
        let tuples = [];
        for (let i = 0; i < tupleCount; i++) {
          let tuple = [];
          for (let axisIndex = 0; axisIndex < axisCount; axisIndex++) {
            tuple.push(this.parseF2Dot14());
          }
          tuples.push(tuple);
        }
        return tuples;
      };
      Parser.prototype.parseStruct = function(description) {
        if (typeof description === "function") {
          return description.call(this);
        } else {
          const fields = Object.keys(description);
          const struct = {};
          for (let j = 0; j < fields.length; j++) {
            const fieldName = fields[j];
            const fieldType = description[fieldName];
            struct[fieldName] = fieldType.call(this);
          }
          return struct;
        }
      };
      Parser.prototype.parseValueRecord = function(valueFormat) {
        if (valueFormat === void 0) {
          valueFormat = this.parseUShort();
        }
        if (valueFormat === 0) {
          return;
        }
        const valueRecord = {};
        if (valueFormat & 1) {
          valueRecord.xPlacement = this.parseShort();
        }
        if (valueFormat & 2) {
          valueRecord.yPlacement = this.parseShort();
        }
        if (valueFormat & 4) {
          valueRecord.xAdvance = this.parseShort();
        }
        if (valueFormat & 8) {
          valueRecord.yAdvance = this.parseShort();
        }
        if (valueFormat & 16) {
          valueRecord.xPlaDevice = void 0;
          this.parseShort();
        }
        if (valueFormat & 32) {
          valueRecord.yPlaDevice = void 0;
          this.parseShort();
        }
        if (valueFormat & 64) {
          valueRecord.xAdvDevice = void 0;
          this.parseShort();
        }
        if (valueFormat & 128) {
          valueRecord.yAdvDevice = void 0;
          this.parseShort();
        }
        return valueRecord;
      };
      Parser.prototype.parseValueRecordList = function() {
        const valueFormat = this.parseUShort();
        const valueCount = this.parseUShort();
        const values = new Array(valueCount);
        for (let i = 0; i < valueCount; i++) {
          values[i] = this.parseValueRecord(valueFormat);
        }
        return values;
      };
      Parser.prototype.parsePointer = function(description) {
        const structOffset = this.parseOffset16();
        if (structOffset > 0) {
          return new Parser(this.data, this.offset + structOffset).parseStruct(description);
        }
        return void 0;
      };
      Parser.prototype.parsePointer32 = function(description) {
        const structOffset = this.parseOffset32();
        if (structOffset > 0) {
          return new Parser(this.data, this.offset + structOffset).parseStruct(description);
        }
        return void 0;
      };
      Parser.prototype.parseListOfLists = function(itemCallback) {
        const offsets = this.parseOffset16List();
        const count = offsets.length;
        const relativeOffset = this.relativeOffset;
        const list = new Array(count);
        for (let i = 0; i < count; i++) {
          const start = offsets[i];
          if (start === 0) {
            list[i] = void 0;
            continue;
          }
          this.relativeOffset = start;
          if (itemCallback) {
            const subOffsets = this.parseOffset16List();
            const subList = new Array(subOffsets.length);
            for (let j = 0; j < subOffsets.length; j++) {
              this.relativeOffset = start + subOffsets[j];
              subList[j] = itemCallback.call(this);
            }
            list[i] = subList;
          } else {
            list[i] = this.parseUShortList();
          }
        }
        this.relativeOffset = relativeOffset;
        return list;
      };
      Parser.prototype.parseCoverage = function() {
        const startOffset = this.offset + this.relativeOffset;
        const format = this.parseUShort();
        const count = this.parseUShort();
        if (format === 1) {
          return {
            format: 1,
            glyphs: this.parseUShortList(count)
          };
        } else if (format === 2) {
          const ranges = new Array(count);
          for (let i = 0; i < count; i++) {
            ranges[i] = {
              start: this.parseUShort(),
              end: this.parseUShort(),
              index: this.parseUShort()
            };
          }
          return {
            format: 2,
            ranges
          };
        }
        throw new Error("0x" + startOffset.toString(16) + ": Coverage format must be 1 or 2.");
      };
      Parser.prototype.parseClassDef = function() {
        const startOffset = this.offset + this.relativeOffset;
        const format = this.parseUShort();
        if (format === 1) {
          return {
            format: 1,
            startGlyph: this.parseUShort(),
            classes: this.parseUShortList()
          };
        } else if (format === 2) {
          return {
            format: 2,
            ranges: this.parseRecordList({
              start: Parser.uShort,
              end: Parser.uShort,
              classId: Parser.uShort
            })
          };
        }
        console.warn(`0x${startOffset.toString(16)}: This font file uses an invalid ClassDef format of ${format}. It might be corrupted and should be reacquired if it doesn't display as intended.`);
        return {
          format
        };
      };
      Parser.list = function(count, itemCallback) {
        return function() {
          return this.parseList(count, itemCallback);
        };
      };
      Parser.list32 = function(count, itemCallback) {
        return function() {
          return this.parseList32(count, itemCallback);
        };
      };
      Parser.recordList = function(count, recordDescription) {
        return function() {
          return this.parseRecordList(count, recordDescription);
        };
      };
      Parser.recordList32 = function(count, recordDescription) {
        return function() {
          return this.parseRecordList32(count, recordDescription);
        };
      };
      Parser.pointer = function(description) {
        return function() {
          return this.parsePointer(description);
        };
      };
      Parser.pointer32 = function(description) {
        return function() {
          return this.parsePointer32(description);
        };
      };
      Parser.tag = Parser.prototype.parseTag;
      Parser.byte = Parser.prototype.parseByte;
      Parser.uShort = Parser.offset16 = Parser.prototype.parseUShort;
      Parser.uShortList = Parser.prototype.parseUShortList;
      Parser.uInt24 = Parser.prototype.parseUInt24;
      Parser.uLong = Parser.offset32 = Parser.prototype.parseULong;
      Parser.uLongList = Parser.prototype.parseULongList;
      Parser.fixed = Parser.prototype.parseFixed;
      Parser.f2Dot14 = Parser.prototype.parseF2Dot14;
      Parser.struct = Parser.prototype.parseStruct;
      Parser.coverage = Parser.prototype.parseCoverage;
      Parser.classDef = Parser.prototype.parseClassDef;
      var langSysTable = {
        reserved: Parser.uShort,
        reqFeatureIndex: Parser.uShort,
        featureIndexes: Parser.uShortList
      };
      Parser.prototype.parseScriptList = function() {
        return this.parsePointer(Parser.recordList({
          tag: Parser.tag,
          script: Parser.pointer({
            defaultLangSys: Parser.pointer(langSysTable),
            langSysRecords: Parser.recordList({
              tag: Parser.tag,
              langSys: Parser.pointer(langSysTable)
            })
          })
        })) || [];
      };
      Parser.prototype.parseFeatureList = function() {
        return this.parsePointer(Parser.recordList({
          tag: Parser.tag,
          feature: Parser.pointer({
            featureParams: Parser.offset16,
            lookupListIndexes: Parser.uShortList
          })
        })) || [];
      };
      Parser.prototype.parseLookupList = function(lookupTableParsers) {
        return this.parsePointer(Parser.list(Parser.pointer(function() {
          const lookupType = this.parseUShort();
          check_default.argument(1 <= lookupType && lookupType <= 9, "GPOS/GSUB lookup type " + lookupType + " unknown.");
          const lookupFlag = this.parseUShort();
          const useMarkFilteringSet = lookupFlag & 16;
          return {
            lookupType,
            lookupFlag,
            subtables: this.parseList(Parser.pointer(lookupTableParsers[lookupType])),
            markFilteringSet: useMarkFilteringSet ? this.parseUShort() : void 0
          };
        }))) || [];
      };
      Parser.prototype.parseFeatureVariationsList = function() {
        return this.parsePointer32(function() {
          const majorVersion = this.parseUShort();
          const minorVersion = this.parseUShort();
          check_default.argument(majorVersion === 1 && minorVersion < 1, "GPOS/GSUB feature variations table unknown.");
          const featureVariations = this.parseRecordList32({
            conditionSetOffset: Parser.offset32,
            featureTableSubstitutionOffset: Parser.offset32
          });
          return featureVariations;
        }) || [];
      };
      Parser.prototype.parseVariationStore = function() {
        const vsOffset = this.relativeOffset;
        const length = this.parseUShort();
        const variationStore = {
          itemVariationStore: this.parseItemVariationStore()
        };
        this.relativeOffset = vsOffset + length + 2;
        return variationStore;
      };
      Parser.prototype.parseItemVariationStore = function() {
        const itemStoreOffset = this.relativeOffset;
        const iVStore = {
          format: this.parseUShort(),
          variationRegions: [],
          itemVariationSubtables: []
        };
        const variationRegionListOffset = this.parseOffset32();
        const itemVariationDataCount = this.parseUShort();
        const itemVariationDataOffsets = this.parseULongList(itemVariationDataCount);
        this.relativeOffset = itemStoreOffset + variationRegionListOffset;
        iVStore.variationRegions = this.parseVariationRegionList();
        for (let i = 0; i < itemVariationDataCount; i++) {
          const subtableOffset = itemVariationDataOffsets[i];
          this.relativeOffset = itemStoreOffset + subtableOffset;
          iVStore.itemVariationSubtables.push(this.parseItemVariationSubtable());
        }
        return iVStore;
      };
      Parser.prototype.parseVariationRegionList = function() {
        const axisCount = this.parseUShort();
        const regionCount = this.parseUShort();
        return this.parseRecordList(regionCount, {
          regionAxes: Parser.recordList(axisCount, {
            startCoord: Parser.f2Dot14,
            peakCoord: Parser.f2Dot14,
            endCoord: Parser.f2Dot14
          })
        });
      };
      Parser.prototype.parseItemVariationSubtable = function() {
        const itemCount = this.parseUShort();
        const wordDeltaCount = this.parseUShort();
        const regionIndexes = this.parseUShortList();
        const regionIndexCount = regionIndexes.length;
        const subtable = {
          regionIndexes,
          deltaSets: itemCount && regionIndexCount ? this.parseDeltaSets(itemCount, wordDeltaCount, regionIndexCount) : []
        };
        return subtable;
      };
      Parser.prototype.parseDeltaSetIndexMap = function() {
        const format = this.parseByte();
        const entryFormat = this.parseByte();
        const map = [];
        let mapCount = 0;
        switch (format) {
          case 0:
            mapCount = this.parseUShort();
            break;
          case 1:
            mapCount = this.parseULong();
            break;
          default:
            console.error(`unsupported DeltaSetIndexMap format ${format}`);
        }
        if (!mapCount) return {
          format,
          entryFormat
        };
        const bitCount = (entryFormat & masks.INNER_INDEX_BIT_COUNT_MASK) + 1;
        const entrySize = ((entryFormat & masks.MAP_ENTRY_SIZE_MASK) >> 4) + 1;
        for (let n = 0; n < mapCount; n++) {
          let entry;
          if (entrySize === 1) {
            entry = this.parseByte();
          } else if (entrySize === 2) {
            entry = this.parseUShort();
          } else if (entrySize === 3) {
            entry = this.parseUInt24();
          } else if (entrySize === 4) {
            entry = this.parseULong();
          } else {
            throw new Error(`Invalid entry size of ${entrySize}`);
          }
          const outerIndex = entry >> bitCount;
          const innerIndex = entry & (1 << bitCount) - 1;
          map.push({ outerIndex, innerIndex });
        }
        return {
          format,
          entryFormat,
          map
        };
      };
      Parser.prototype.parseDeltaSets = function(itemCount, wordDeltaCount, regionIndexCount) {
        const deltas = Array.from({ length: itemCount }, () => []);
        const longFlag = wordDeltaCount & masks.LONG_WORDS;
        const wordCount = wordDeltaCount & masks.WORD_DELTA_COUNT_MASK;
        if (wordCount > regionIndexCount) {
          throw Error("wordCount must be less than or equal to regionIndexCount");
        }
        const wordParser = (longFlag ? this.parseLong : this.parseShort).bind(this);
        const restParser = (longFlag ? this.parseShort : this.parseChar).bind(this);
        for (let i = 0; i < itemCount; i++) {
          for (let j = 0; j < regionIndexCount; j++) {
            if (j < wordCount) {
              deltas[i].push(wordParser());
            } else {
              deltas[i].push(restParser());
            }
          }
        }
        return deltas;
      };
      Parser.prototype.parseTupleVariationStoreList = function(axisCount, flavor, glyphs) {
        const glyphCount = this.parseUShort();
        const flags = this.parseUShort();
        const offsetSizeIs32Bit = flags & 1;
        const glyphVariationDataArrayOffset = this.parseOffset32();
        const parseOffset = (offsetSizeIs32Bit ? this.parseULong : this.parseUShort).bind(this);
        const glyphVariations = {};
        let currentOffset = parseOffset();
        if (!offsetSizeIs32Bit) currentOffset *= 2;
        let nextOffset;
        for (let i = 0; i < glyphCount; i++) {
          nextOffset = parseOffset();
          if (!offsetSizeIs32Bit) nextOffset *= 2;
          const length = nextOffset - currentOffset;
          glyphVariations[i] = length ? this.parseTupleVariationStore(
            glyphVariationDataArrayOffset + currentOffset,
            axisCount,
            flavor,
            glyphs,
            i
          ) : void 0;
          currentOffset = nextOffset;
        }
        return glyphVariations;
      };
      Parser.prototype.parseTupleVariationStore = function(tableOffset, axisCount, flavor, glyphs, glyphIndex) {
        const relativeOffset = this.relativeOffset;
        this.relativeOffset = tableOffset;
        if (flavor === "cvar") {
          this.relativeOffset += 4;
        }
        const tupleVariationCount = this.parseUShort();
        const hasSharedPoints = !!(tupleVariationCount & masks.SHARED_POINT_NUMBERS);
        const count = tupleVariationCount & masks.COUNT_MASK;
        let dataOffset = this.parseOffset16();
        const headers = [];
        let sharedPoints = [];
        for (let h = 0; h < count; h++) {
          const headerData = this.parseTupleVariationHeader(axisCount, flavor);
          headers.push(headerData);
        }
        if (this.relativeOffset !== tableOffset + dataOffset) {
          console.warn(`Unexpected offset after parsing tuple variation headers! Expected ${tableOffset + dataOffset}, actually ${this.relativeOffset}`);
          this.relativeOffset = tableOffset + dataOffset;
        }
        if (hasSharedPoints) {
          sharedPoints = this.parsePackedPointNumbers();
        }
        let serializedDataOffset = this.relativeOffset;
        for (let h = 0; h < count; h++) {
          const header = headers[h];
          header.privatePoints = [];
          this.relativeOffset = serializedDataOffset;
          if (flavor === "cvar" && !header.peakTuple) {
            console.warn("An embedded peak tuple is required in TupleVariationHeaders for the cvar table.");
          }
          if (header.flags.privatePointNumbers) {
            header.privatePoints = this.parsePackedPointNumbers();
          }
          delete header.flags;
          const deltasOffset = this.offset;
          const deltasRelativeOffset = this.relativeOffset;
          const defineDeltas = (propertyName) => {
            let _deltas = void 0;
            let _deltasY = void 0;
            const parseDeltas = () => {
              let pointsCount = 0;
              if (flavor === "gvar") {
                pointsCount = header.privatePoints.length || sharedPoints.length;
                if (!pointsCount) {
                  const glyph = glyphs.get(glyphIndex);
                  glyph.path;
                  pointsCount = glyph.points.length;
                  pointsCount += 4;
                }
              } else if (flavor === "cvar") {
                pointsCount = glyphs.length;
              }
              this.offset = deltasOffset;
              this.relativeOffset = deltasRelativeOffset;
              _deltas = this.parsePackedDeltas(pointsCount);
              if (flavor === "gvar") {
                _deltasY = this.parsePackedDeltas(pointsCount);
              }
            };
            return {
              configurable: true,
              get: function() {
                if (_deltas === void 0) parseDeltas();
                return propertyName === "deltasY" ? _deltasY : _deltas;
              },
              set: function(deltas) {
                if (_deltas === void 0) parseDeltas();
                if (propertyName === "deltasY") {
                  _deltasY = deltas;
                } else {
                  _deltas = deltas;
                }
              }
            };
          };
          Object.defineProperty(header, "deltas", defineDeltas.call(this, "deltas"));
          if (flavor === "gvar") {
            Object.defineProperty(header, "deltasY", defineDeltas.call(this, "deltasY"));
          }
          serializedDataOffset += header.variationDataSize;
          delete header.variationDataSize;
        }
        this.relativeOffset = relativeOffset;
        const result = {
          headers
        };
        result.sharedPoints = sharedPoints;
        return result;
      };
      Parser.prototype.parseTupleVariationHeader = function(axisCount, flavor) {
        const variationDataSize = this.parseUShort();
        const tupleIndex = this.parseUShort();
        const embeddedPeakTuple = !!(tupleIndex & masks.EMBEDDED_PEAK_TUPLE);
        const intermediateRegion = !!(tupleIndex & masks.INTERMEDIATE_REGION);
        const privatePointNumbers = !!(tupleIndex & masks.PRIVATE_POINT_NUMBERS);
        const sharedTupleRecordsIndex = embeddedPeakTuple ? void 0 : tupleIndex & masks.TUPLE_INDEX_MASK;
        const peakTuple = embeddedPeakTuple ? this.parseTupleRecords(1, axisCount)[0] : void 0;
        const intermediateStartTuple = intermediateRegion ? this.parseTupleRecords(1, axisCount)[0] : void 0;
        const intermediateEndTuple = intermediateRegion ? this.parseTupleRecords(1, axisCount)[0] : void 0;
        const result = {
          variationDataSize,
          peakTuple,
          intermediateStartTuple,
          intermediateEndTuple,
          flags: {
            embeddedPeakTuple,
            intermediateRegion,
            privatePointNumbers
          }
        };
        if (flavor === "gvar") {
          result.sharedTupleRecordsIndex = sharedTupleRecordsIndex;
        }
        return result;
      };
      Parser.prototype.parsePackedPointNumbers = function() {
        const countByte1 = this.parseByte();
        const points = [];
        let totalPointCount = countByte1;
        if (countByte1 >= 128) {
          const countByte2 = this.parseByte();
          totalPointCount = (countByte1 & masks.POINT_RUN_COUNT_MASK) << 8 | countByte2;
        }
        let lastPoint = 0;
        while (points.length < totalPointCount) {
          const controlByte = this.parseByte();
          const numbersAre16Bit = !!(controlByte & masks.POINTS_ARE_WORDS);
          let runCount = (controlByte & masks.POINT_RUN_COUNT_MASK) + 1;
          for (let i = 0; i < runCount && points.length < totalPointCount; i++) {
            let pointDelta;
            if (numbersAre16Bit) {
              pointDelta = this.parseUShort();
            } else {
              pointDelta = this.parseByte();
            }
            lastPoint = lastPoint + pointDelta;
            points.push(lastPoint);
          }
        }
        return points;
      };
      Parser.prototype.parsePackedDeltas = function(expectedCount) {
        const deltas = [];
        while (deltas.length < expectedCount) {
          const controlByte = this.parseByte();
          const zeroData = !!(controlByte & masks.DELTAS_ARE_ZERO);
          const deltaWords = !!(controlByte & masks.DELTAS_ARE_WORDS);
          const runCount = (controlByte & masks.DELTA_RUN_COUNT_MASK) + 1;
          for (let i = 0; i < runCount && deltas.length < expectedCount; i++) {
            if (zeroData) {
              deltas.push(0);
            } else if (deltaWords) {
              deltas.push(this.parseShort());
            } else {
              deltas.push(this.parseChar());
            }
          }
        }
        return deltas;
      };
      var parse_default = {
        getByte,
        getCard8: getByte,
        getUShort,
        getCard16: getUShort,
        getShort,
        getUInt24,
        getULong,
        getFixed,
        getTag,
        getOffset,
        getBytes,
        bytesToString,
        Parser
      };
      var nameTableNames = [
        "copyright",
        // 0
        "fontFamily",
        // 1
        "fontSubfamily",
        // 2
        "uniqueID",
        // 3
        "fullName",
        // 4
        "version",
        // 5
        "postScriptName",
        // 6
        "trademark",
        // 7
        "manufacturer",
        // 8
        "designer",
        // 9
        "description",
        // 10
        "manufacturerURL",
        // 11
        "designerURL",
        // 12
        "license",
        // 13
        "licenseURL",
        // 14
        "reserved",
        // 15
        "preferredFamily",
        // 16
        "preferredSubfamily",
        // 17
        "compatibleFullName",
        // 18
        "sampleText",
        // 19
        "postScriptFindFontName",
        // 20
        "wwsFamily",
        // 21
        "wwsSubfamily"
        // 22
      ];
      var macLanguages = {
        0: "en",
        1: "fr",
        2: "de",
        3: "it",
        4: "nl",
        5: "sv",
        6: "es",
        7: "da",
        8: "pt",
        9: "no",
        10: "he",
        11: "ja",
        12: "ar",
        13: "fi",
        14: "el",
        15: "is",
        16: "mt",
        17: "tr",
        18: "hr",
        19: "zh-Hant",
        20: "ur",
        21: "hi",
        22: "th",
        23: "ko",
        24: "lt",
        25: "pl",
        26: "hu",
        27: "es",
        28: "lv",
        29: "se",
        30: "fo",
        31: "fa",
        32: "ru",
        33: "zh",
        34: "nl-BE",
        35: "ga",
        36: "sq",
        37: "ro",
        38: "cz",
        39: "sk",
        40: "si",
        41: "yi",
        42: "sr",
        43: "mk",
        44: "bg",
        45: "uk",
        46: "be",
        47: "uz",
        48: "kk",
        49: "az-Cyrl",
        50: "az-Arab",
        51: "hy",
        52: "ka",
        53: "mo",
        54: "ky",
        55: "tg",
        56: "tk",
        57: "mn-CN",
        58: "mn",
        59: "ps",
        60: "ks",
        61: "ku",
        62: "sd",
        63: "bo",
        64: "ne",
        65: "sa",
        66: "mr",
        67: "bn",
        68: "as",
        69: "gu",
        70: "pa",
        71: "or",
        72: "ml",
        73: "kn",
        74: "ta",
        75: "te",
        76: "si",
        77: "my",
        78: "km",
        79: "lo",
        80: "vi",
        81: "id",
        82: "tl",
        83: "ms",
        84: "ms-Arab",
        85: "am",
        86: "ti",
        87: "om",
        88: "so",
        89: "sw",
        90: "rw",
        91: "rn",
        92: "ny",
        93: "mg",
        94: "eo",
        128: "cy",
        129: "eu",
        130: "ca",
        131: "la",
        132: "qu",
        133: "gn",
        134: "ay",
        135: "tt",
        136: "ug",
        137: "dz",
        138: "jv",
        139: "su",
        140: "gl",
        141: "af",
        142: "br",
        143: "iu",
        144: "gd",
        145: "gv",
        146: "ga",
        147: "to",
        148: "el-polyton",
        149: "kl",
        150: "az",
        151: "nn"
      };
      var macLanguageToScript = {
        0: 0,
        // langEnglish → smRoman
        1: 0,
        // langFrench → smRoman
        2: 0,
        // langGerman → smRoman
        3: 0,
        // langItalian → smRoman
        4: 0,
        // langDutch → smRoman
        5: 0,
        // langSwedish → smRoman
        6: 0,
        // langSpanish → smRoman
        7: 0,
        // langDanish → smRoman
        8: 0,
        // langPortuguese → smRoman
        9: 0,
        // langNorwegian → smRoman
        10: 5,
        // langHebrew → smHebrew
        11: 1,
        // langJapanese → smJapanese
        12: 4,
        // langArabic → smArabic
        13: 0,
        // langFinnish → smRoman
        14: 6,
        // langGreek → smGreek
        15: 0,
        // langIcelandic → smRoman (modified)
        16: 0,
        // langMaltese → smRoman
        17: 0,
        // langTurkish → smRoman (modified)
        18: 0,
        // langCroatian → smRoman (modified)
        19: 2,
        // langTradChinese → smTradChinese
        20: 4,
        // langUrdu → smArabic
        21: 9,
        // langHindi → smDevanagari
        22: 21,
        // langThai → smThai
        23: 3,
        // langKorean → smKorean
        24: 29,
        // langLithuanian → smCentralEuroRoman
        25: 29,
        // langPolish → smCentralEuroRoman
        26: 29,
        // langHungarian → smCentralEuroRoman
        27: 29,
        // langEstonian → smCentralEuroRoman
        28: 29,
        // langLatvian → smCentralEuroRoman
        29: 0,
        // langSami → smRoman
        30: 0,
        // langFaroese → smRoman (modified)
        31: 4,
        // langFarsi → smArabic (modified)
        32: 7,
        // langRussian → smCyrillic
        33: 25,
        // langSimpChinese → smSimpChinese
        34: 0,
        // langFlemish → smRoman
        35: 0,
        // langIrishGaelic → smRoman (modified)
        36: 0,
        // langAlbanian → smRoman
        37: 0,
        // langRomanian → smRoman (modified)
        38: 29,
        // langCzech → smCentralEuroRoman
        39: 29,
        // langSlovak → smCentralEuroRoman
        40: 0,
        // langSlovenian → smRoman (modified)
        41: 5,
        // langYiddish → smHebrew
        42: 7,
        // langSerbian → smCyrillic
        43: 7,
        // langMacedonian → smCyrillic
        44: 7,
        // langBulgarian → smCyrillic
        45: 7,
        // langUkrainian → smCyrillic (modified)
        46: 7,
        // langByelorussian → smCyrillic
        47: 7,
        // langUzbek → smCyrillic
        48: 7,
        // langKazakh → smCyrillic
        49: 7,
        // langAzerbaijani → smCyrillic
        50: 4,
        // langAzerbaijanAr → smArabic
        51: 24,
        // langArmenian → smArmenian
        52: 23,
        // langGeorgian → smGeorgian
        53: 7,
        // langMoldavian → smCyrillic
        54: 7,
        // langKirghiz → smCyrillic
        55: 7,
        // langTajiki → smCyrillic
        56: 7,
        // langTurkmen → smCyrillic
        57: 27,
        // langMongolian → smMongolian
        58: 7,
        // langMongolianCyr → smCyrillic
        59: 4,
        // langPashto → smArabic
        60: 4,
        // langKurdish → smArabic
        61: 4,
        // langKashmiri → smArabic
        62: 4,
        // langSindhi → smArabic
        63: 26,
        // langTibetan → smTibetan
        64: 9,
        // langNepali → smDevanagari
        65: 9,
        // langSanskrit → smDevanagari
        66: 9,
        // langMarathi → smDevanagari
        67: 13,
        // langBengali → smBengali
        68: 13,
        // langAssamese → smBengali
        69: 11,
        // langGujarati → smGujarati
        70: 10,
        // langPunjabi → smGurmukhi
        71: 12,
        // langOriya → smOriya
        72: 17,
        // langMalayalam → smMalayalam
        73: 16,
        // langKannada → smKannada
        74: 14,
        // langTamil → smTamil
        75: 15,
        // langTelugu → smTelugu
        76: 18,
        // langSinhalese → smSinhalese
        77: 19,
        // langBurmese → smBurmese
        78: 20,
        // langKhmer → smKhmer
        79: 22,
        // langLao → smLao
        80: 30,
        // langVietnamese → smVietnamese
        81: 0,
        // langIndonesian → smRoman
        82: 0,
        // langTagalog → smRoman
        83: 0,
        // langMalayRoman → smRoman
        84: 4,
        // langMalayArabic → smArabic
        85: 28,
        // langAmharic → smEthiopic
        86: 28,
        // langTigrinya → smEthiopic
        87: 28,
        // langOromo → smEthiopic
        88: 0,
        // langSomali → smRoman
        89: 0,
        // langSwahili → smRoman
        90: 0,
        // langKinyarwanda → smRoman
        91: 0,
        // langRundi → smRoman
        92: 0,
        // langNyanja → smRoman
        93: 0,
        // langMalagasy → smRoman
        94: 0,
        // langEsperanto → smRoman
        128: 0,
        // langWelsh → smRoman (modified)
        129: 0,
        // langBasque → smRoman
        130: 0,
        // langCatalan → smRoman
        131: 0,
        // langLatin → smRoman
        132: 0,
        // langQuechua → smRoman
        133: 0,
        // langGuarani → smRoman
        134: 0,
        // langAymara → smRoman
        135: 7,
        // langTatar → smCyrillic
        136: 4,
        // langUighur → smArabic
        137: 26,
        // langDzongkha → smTibetan
        138: 0,
        // langJavaneseRom → smRoman
        139: 0,
        // langSundaneseRom → smRoman
        140: 0,
        // langGalician → smRoman
        141: 0,
        // langAfrikaans → smRoman
        142: 0,
        // langBreton → smRoman (modified)
        143: 28,
        // langInuktitut → smEthiopic (modified)
        144: 0,
        // langScottishGaelic → smRoman (modified)
        145: 0,
        // langManxGaelic → smRoman (modified)
        146: 0,
        // langIrishGaelicScript → smRoman (modified)
        147: 0,
        // langTongan → smRoman
        148: 6,
        // langGreekAncient → smRoman
        149: 0,
        // langGreenlandic → smRoman
        150: 0,
        // langAzerbaijanRoman → smRoman
        151: 0
        // langNynorsk → smRoman
      };
      var windowsLanguages = {
        1078: "af",
        1052: "sq",
        1156: "gsw",
        1118: "am",
        5121: "ar-DZ",
        15361: "ar-BH",
        3073: "ar",
        2049: "ar-IQ",
        11265: "ar-JO",
        13313: "ar-KW",
        12289: "ar-LB",
        4097: "ar-LY",
        6145: "ary",
        8193: "ar-OM",
        16385: "ar-QA",
        1025: "ar-SA",
        10241: "ar-SY",
        7169: "aeb",
        14337: "ar-AE",
        9217: "ar-YE",
        1067: "hy",
        1101: "as",
        2092: "az-Cyrl",
        1068: "az",
        1133: "ba",
        1069: "eu",
        1059: "be",
        2117: "bn",
        1093: "bn-IN",
        8218: "bs-Cyrl",
        5146: "bs",
        1150: "br",
        1026: "bg",
        1027: "ca",
        3076: "zh-HK",
        5124: "zh-MO",
        2052: "zh",
        4100: "zh-SG",
        1028: "zh-TW",
        1155: "co",
        1050: "hr",
        4122: "hr-BA",
        1029: "cs",
        1030: "da",
        1164: "prs",
        1125: "dv",
        2067: "nl-BE",
        1043: "nl",
        3081: "en-AU",
        10249: "en-BZ",
        4105: "en-CA",
        9225: "en-029",
        16393: "en-IN",
        6153: "en-IE",
        8201: "en-JM",
        17417: "en-MY",
        5129: "en-NZ",
        13321: "en-PH",
        18441: "en-SG",
        7177: "en-ZA",
        11273: "en-TT",
        2057: "en-GB",
        1033: "en",
        12297: "en-ZW",
        1061: "et",
        1080: "fo",
        1124: "fil",
        1035: "fi",
        2060: "fr-BE",
        3084: "fr-CA",
        1036: "fr",
        5132: "fr-LU",
        6156: "fr-MC",
        4108: "fr-CH",
        1122: "fy",
        1110: "gl",
        1079: "ka",
        3079: "de-AT",
        1031: "de",
        5127: "de-LI",
        4103: "de-LU",
        2055: "de-CH",
        1032: "el",
        1135: "kl",
        1095: "gu",
        1128: "ha",
        1037: "he",
        1081: "hi",
        1038: "hu",
        1039: "is",
        1136: "ig",
        1057: "id",
        1117: "iu",
        2141: "iu-Latn",
        2108: "ga",
        1076: "xh",
        1077: "zu",
        1040: "it",
        2064: "it-CH",
        1041: "ja",
        1099: "kn",
        1087: "kk",
        1107: "km",
        1158: "quc",
        1159: "rw",
        1089: "sw",
        1111: "kok",
        1042: "ko",
        1088: "ky",
        1108: "lo",
        1062: "lv",
        1063: "lt",
        2094: "dsb",
        1134: "lb",
        1071: "mk",
        2110: "ms-BN",
        1086: "ms",
        1100: "ml",
        1082: "mt",
        1153: "mi",
        1146: "arn",
        1102: "mr",
        1148: "moh",
        1104: "mn",
        2128: "mn-CN",
        1121: "ne",
        1044: "nb",
        2068: "nn",
        1154: "oc",
        1096: "or",
        1123: "ps",
        1045: "pl",
        1046: "pt",
        2070: "pt-PT",
        1094: "pa",
        1131: "qu-BO",
        2155: "qu-EC",
        3179: "qu",
        1048: "ro",
        1047: "rm",
        1049: "ru",
        9275: "smn",
        4155: "smj-NO",
        5179: "smj",
        3131: "se-FI",
        1083: "se",
        2107: "se-SE",
        8251: "sms",
        6203: "sma-NO",
        7227: "sms",
        1103: "sa",
        7194: "sr-Cyrl-BA",
        3098: "sr",
        6170: "sr-Latn-BA",
        2074: "sr-Latn",
        1132: "nso",
        1074: "tn",
        1115: "si",
        1051: "sk",
        1060: "sl",
        11274: "es-AR",
        16394: "es-BO",
        13322: "es-CL",
        9226: "es-CO",
        5130: "es-CR",
        7178: "es-DO",
        12298: "es-EC",
        17418: "es-SV",
        4106: "es-GT",
        18442: "es-HN",
        2058: "es-MX",
        19466: "es-NI",
        6154: "es-PA",
        15370: "es-PY",
        10250: "es-PE",
        20490: "es-PR",
        // Microsoft has defined two different language codes for
        // “Spanish with modern sorting” and “Spanish with traditional
        // sorting”. This makes sense for collation APIs, and it would be
        // possible to express this in BCP 47 language tags via Unicode
        // extensions (eg., es-u-co-trad is Spanish with traditional
        // sorting). However, for storing names in fonts, the distinction
        // does not make sense, so we give “es” in both cases.
        3082: "es",
        1034: "es",
        21514: "es-US",
        14346: "es-UY",
        8202: "es-VE",
        2077: "sv-FI",
        1053: "sv",
        1114: "syr",
        1064: "tg",
        2143: "tzm",
        1097: "ta",
        1092: "tt",
        1098: "te",
        1054: "th",
        1105: "bo",
        1055: "tr",
        1090: "tk",
        1152: "ug",
        1058: "uk",
        1070: "hsb",
        1056: "ur",
        2115: "uz-Cyrl",
        1091: "uz",
        1066: "vi",
        1106: "cy",
        1160: "wo",
        1157: "sah",
        1144: "ii",
        1130: "yo"
      };
      function getLanguageCode(platformID, languageID, ltag) {
        switch (platformID) {
          case 0:
            if (languageID === 65535) {
              return "und";
            } else if (ltag) {
              return ltag[languageID];
            }
            break;
          case 1:
            return macLanguages[languageID];
          case 3:
            return windowsLanguages[languageID];
        }
        return void 0;
      }
      var utf16 = "utf-16";
      var macScriptEncodings = {
        0: "macintosh",
        // smRoman
        1: "x-mac-japanese",
        // smJapanese
        2: "x-mac-chinesetrad",
        // smTradChinese
        3: "x-mac-korean",
        // smKorean
        6: "x-mac-greek",
        // smGreek
        7: "x-mac-cyrillic",
        // smCyrillic
        9: "x-mac-devanagai",
        // smDevanagari
        10: "x-mac-gurmukhi",
        // smGurmukhi
        11: "x-mac-gujarati",
        // smGujarati
        12: "x-mac-oriya",
        // smOriya
        13: "x-mac-bengali",
        // smBengali
        14: "x-mac-tamil",
        // smTamil
        15: "x-mac-telugu",
        // smTelugu
        16: "x-mac-kannada",
        // smKannada
        17: "x-mac-malayalam",
        // smMalayalam
        18: "x-mac-sinhalese",
        // smSinhalese
        19: "x-mac-burmese",
        // smBurmese
        20: "x-mac-khmer",
        // smKhmer
        21: "x-mac-thai",
        // smThai
        22: "x-mac-lao",
        // smLao
        23: "x-mac-georgian",
        // smGeorgian
        24: "x-mac-armenian",
        // smArmenian
        25: "x-mac-chinesesimp",
        // smSimpChinese
        26: "x-mac-tibetan",
        // smTibetan
        27: "x-mac-mongolian",
        // smMongolian
        28: "x-mac-ethiopic",
        // smEthiopic
        29: "x-mac-ce",
        // smCentralEuroRoman
        30: "x-mac-vietnamese",
        // smVietnamese
        31: "x-mac-extarabic"
        // smExtArabic
      };
      var macLanguageEncodings = {
        15: "x-mac-icelandic",
        // langIcelandic
        17: "x-mac-turkish",
        // langTurkish
        18: "x-mac-croatian",
        // langCroatian
        24: "x-mac-ce",
        // langLithuanian
        25: "x-mac-ce",
        // langPolish
        26: "x-mac-ce",
        // langHungarian
        27: "x-mac-ce",
        // langEstonian
        28: "x-mac-ce",
        // langLatvian
        30: "x-mac-icelandic",
        // langFaroese
        37: "x-mac-romanian",
        // langRomanian
        38: "x-mac-ce",
        // langCzech
        39: "x-mac-ce",
        // langSlovak
        40: "x-mac-ce",
        // langSlovenian
        143: "x-mac-inuit",
        // langInuktitut
        146: "x-mac-gaelic"
        // langIrishGaelicScript
      };
      function getEncoding(platformID, encodingID, languageID) {
        switch (platformID) {
          case 0:
            return utf16;
          case 1:
            return macLanguageEncodings[languageID] || macScriptEncodings[encodingID];
          case 3:
            if (encodingID === 1 || encodingID === 10) {
              return utf16;
            }
            break;
        }
        return void 0;
      }
      var platforms = {
        0: "unicode",
        1: "macintosh",
        2: "reserved",
        3: "windows"
      };
      function getPlatform(platformID) {
        return platforms[platformID];
      }
      function parseNameTable(data, start, ltag) {
        const name = {};
        const p = new parse_default.Parser(data, start);
        const format = p.parseUShort();
        const count = p.parseUShort();
        const stringOffset = p.offset + p.parseUShort();
        for (let i = 0; i < count; i++) {
          const platformID = p.parseUShort();
          const encodingID = p.parseUShort();
          const languageID = p.parseUShort();
          const nameID = p.parseUShort();
          const property = nameTableNames[nameID] || nameID;
          const byteLength = p.parseUShort();
          const offset = p.parseUShort();
          const language = getLanguageCode(platformID, languageID, ltag);
          const encoding = getEncoding(platformID, encodingID, languageID);
          const platformName = getPlatform(platformID);
          if (encoding !== void 0 && language !== void 0 && platformName !== void 0) {
            let text;
            if (encoding === utf16) {
              text = decode.UTF16(data, stringOffset + offset, byteLength);
            } else {
              text = decode.MACSTRING(data, stringOffset + offset, byteLength, encoding);
            }
            if (text) {
              let platform = name[platformName];
              if (platform === void 0) {
                platform = name[platformName] = {};
              }
              let translations = platform[property];
              if (translations === void 0) {
                translations = platform[property] = {};
              }
              translations[language] = text;
            }
          }
        }
        if (format === 1) {
          p.parseUShort();
        }
        return name;
      }
      function reverseDict(dict) {
        const result = {};
        for (let key in dict) {
          result[dict[key]] = parseInt(key);
        }
        return result;
      }
      function makeNameRecord(platformID, encodingID, languageID, nameID, length, offset) {
        return new table_default.Record("NameRecord", [
          { name: "platformID", type: "USHORT", value: platformID },
          { name: "encodingID", type: "USHORT", value: encodingID },
          { name: "languageID", type: "USHORT", value: languageID },
          { name: "nameID", type: "USHORT", value: nameID },
          { name: "length", type: "USHORT", value: length },
          { name: "offset", type: "USHORT", value: offset }
        ]);
      }
      function findSubArray(needle, haystack) {
        const needleLength = needle.length;
        const limit = haystack.length - needleLength + 1;
        loop:
          for (let pos = 0; pos < limit; pos++) {
            for (; pos < limit; pos++) {
              for (let k = 0; k < needleLength; k++) {
                if (haystack[pos + k] !== needle[k]) {
                  continue loop;
                }
              }
              return pos;
            }
          }
        return -1;
      }
      function addStringToPool(s, pool) {
        let offset = findSubArray(s, pool);
        if (offset < 0) {
          offset = pool.length;
          let i = 0;
          const len = s.length;
          for (; i < len; ++i) {
            pool.push(s[i]);
          }
        }
        return offset;
      }
      function makeNameTable(names, ltag) {
        const platformNameIds = reverseDict(platforms);
        const macLanguageIds = reverseDict(macLanguages);
        const windowsLanguageIds = reverseDict(windowsLanguages);
        const nameRecords = [];
        const stringPool = [];
        for (let platform in names) {
          let nameID;
          const nameIDs = [];
          const namesWithNumericKeys = {};
          const nameTableIds = reverseDict(nameTableNames);
          const platformID = platformNameIds[platform];
          for (let key in names[platform]) {
            let id = nameTableIds[key];
            if (id === void 0) {
              id = key;
            }
            nameID = parseInt(id);
            if (isNaN(nameID)) {
              throw new Error('Name table entry "' + key + '" does not exist, see nameTableNames for complete list.');
            }
            namesWithNumericKeys[nameID] = names[platform][key];
            nameIDs.push(nameID);
          }
          for (let i = 0; i < nameIDs.length; i++) {
            nameID = nameIDs[i];
            const translations = namesWithNumericKeys[nameID];
            for (let lang in translations) {
              const text = translations[lang];
              if (platformID === 1 || platformID === 0) {
                let macLanguage = macLanguageIds[lang];
                let macScript = macLanguageToScript[macLanguage];
                const macEncoding = getEncoding(platformID, macScript, macLanguage);
                let macName = encode.MACSTRING(text, macEncoding);
                if (platformID === 0) {
                  macLanguage = ltag.indexOf(lang);
                  if (macLanguage < 0) {
                    macLanguage = ltag.length;
                    ltag.push(lang);
                  }
                  macScript = 4;
                  macName = encode.UTF16(text);
                }
                if (macName !== void 0) {
                  const macNameOffset = addStringToPool(macName, stringPool);
                  nameRecords.push(makeNameRecord(
                    platformID,
                    macScript,
                    macLanguage,
                    nameID,
                    macName.length,
                    macNameOffset
                  ));
                }
              }
              if (platformID === 3) {
                const winLanguage = windowsLanguageIds[lang];
                if (winLanguage !== void 0) {
                  const winName = encode.UTF16(text);
                  const winNameOffset = addStringToPool(winName, stringPool);
                  nameRecords.push(makeNameRecord(
                    3,
                    1,
                    winLanguage,
                    nameID,
                    winName.length,
                    winNameOffset
                  ));
                }
              }
            }
          }
        }
        nameRecords.sort(function(a, b) {
          return a.platformID - b.platformID || a.encodingID - b.encodingID || a.languageID - b.languageID || a.nameID - b.nameID;
        });
        const t = new table_default.Table("name", [
          { name: "format", type: "USHORT", value: 0 },
          { name: "count", type: "USHORT", value: nameRecords.length },
          { name: "stringOffset", type: "USHORT", value: 6 + nameRecords.length * 12 }
        ]);
        for (let r = 0; r < nameRecords.length; r++) {
          t.fields.push({ name: "record_" + r, type: "RECORD", value: nameRecords[r] });
        }
        t.fields.push({ name: "strings", type: "LITERAL", value: stringPool });
        return t;
      }
      function getNameByID(names, nameID, allowedStandardIDs = []) {
        if (nameID < 256 && nameID in nameTableNames) {
          if (allowedStandardIDs.length && !allowedStandardIDs.includes(parseInt(nameID))) {
            return void 0;
          }
          nameID = nameTableNames[nameID];
        }
        for (let platform in names) {
          for (let nameKey in names[platform]) {
            if (nameKey === nameID || parseInt(nameKey) === nameID) {
              return names[platform][nameKey];
            }
          }
        }
        return void 0;
      }
      var name_default = { parse: parseNameTable, make: makeNameTable, getNameByID };
      function parseCmapTableFormat0(cmap, p, platformID, encodingID) {
        cmap.length = p.parseUShort();
        cmap.language = p.parseUShort() - 1;
        const indexMap = p.parseByteList(cmap.length);
        const glyphIndexMap = Object.assign({}, indexMap);
        const encoding = getEncoding(platformID, encodingID, cmap.language);
        const decodingTable = eightBitMacEncodings[encoding];
        for (let i = 0; i < decodingTable.length; i++) {
          glyphIndexMap[decodingTable.charCodeAt(i)] = indexMap[128 + i];
        }
        cmap.glyphIndexMap = glyphIndexMap;
      }
      function parseCmapTableFormat12or13(cmap, p, format) {
        p.parseUShort();
        cmap.length = p.parseULong();
        cmap.language = p.parseULong();
        let groupCount;
        cmap.groupCount = groupCount = p.parseULong();
        cmap.glyphIndexMap = {};
        for (let i = 0; i < groupCount; i += 1) {
          const startCharCode = p.parseULong();
          const endCharCode = p.parseULong();
          let startGlyphId = p.parseULong();
          for (let c = startCharCode; c <= endCharCode; c += 1) {
            cmap.glyphIndexMap[c] = startGlyphId;
            if (format === 12) {
              startGlyphId++;
            }
          }
        }
      }
      function parseCmapTableFormat4(cmap, p, data, start, offset) {
        cmap.length = p.parseUShort();
        cmap.language = p.parseUShort();
        let segCount;
        cmap.segCount = segCount = p.parseUShort() >> 1;
        p.skip("uShort", 3);
        cmap.glyphIndexMap = {};
        const endCountParser = new parse_default.Parser(data, start + offset + 14);
        const startCountParser = new parse_default.Parser(data, start + offset + 16 + segCount * 2);
        const idDeltaParser = new parse_default.Parser(data, start + offset + 16 + segCount * 4);
        const idRangeOffsetParser = new parse_default.Parser(data, start + offset + 16 + segCount * 6);
        let glyphIndexOffset = start + offset + 16 + segCount * 8;
        for (let i = 0; i < segCount - 1; i += 1) {
          let glyphIndex;
          const endCount = endCountParser.parseUShort();
          const startCount = startCountParser.parseUShort();
          const idDelta = idDeltaParser.parseShort();
          const idRangeOffset = idRangeOffsetParser.parseUShort();
          for (let c = startCount; c <= endCount; c += 1) {
            if (idRangeOffset !== 0) {
              glyphIndexOffset = idRangeOffsetParser.offset + idRangeOffsetParser.relativeOffset - 2;
              glyphIndexOffset += idRangeOffset;
              glyphIndexOffset += (c - startCount) * 2;
              glyphIndex = parse_default.getUShort(data, glyphIndexOffset);
              if (glyphIndex !== 0) {
                glyphIndex = glyphIndex + idDelta & 65535;
              }
            } else {
              glyphIndex = c + idDelta & 65535;
            }
            cmap.glyphIndexMap[c] = glyphIndex;
          }
        }
      }
      function parseCmapTableFormat14(cmap, p) {
        const varSelectorList = {};
        p.skip("uLong");
        const numVarSelectorRecords = p.parseULong();
        for (let i = 0; i < numVarSelectorRecords; i += 1) {
          const varSelector = p.parseUInt24();
          const varSelectorRecord = {
            varSelector
          };
          const defaultUVSOffset = p.parseOffset32();
          const nonDefaultUVSOffset = p.parseOffset32();
          const currentOffset = p.relativeOffset;
          if (defaultUVSOffset) {
            p.relativeOffset = defaultUVSOffset;
            varSelectorRecord.defaultUVS = p.parseStruct({
              ranges: function() {
                return p.parseRecordList32({
                  startUnicodeValue: p.parseUInt24,
                  additionalCount: p.parseByte
                });
              }
            });
          }
          if (nonDefaultUVSOffset) {
            p.relativeOffset = nonDefaultUVSOffset;
            varSelectorRecord.nonDefaultUVS = p.parseStruct({
              uvsMappings: function() {
                const map = {};
                const list = p.parseRecordList32({
                  unicodeValue: p.parseUInt24,
                  glyphID: p.parseUShort
                });
                for (let i2 = 0; i2 < list.length; i2 += 1) {
                  map[list[i2].unicodeValue] = list[i2];
                }
                return map;
              }
            });
          }
          varSelectorList[varSelector] = varSelectorRecord;
          p.relativeOffset = currentOffset;
        }
        cmap.varSelectorList = varSelectorList;
      }
      function parseCmapTable(data, start) {
        const cmap = {};
        cmap.version = parse_default.getUShort(data, start);
        check_default.argument(cmap.version === 0, "cmap table version should be 0.");
        cmap.numTables = parse_default.getUShort(data, start + 2);
        let format14Parser = null;
        let format14offset = -1;
        let offset = -1;
        let platformId = null;
        let encodingId = null;
        const platform0Encodings = [0, 1, 2, 3, 4, 6];
        const platform3Encodings = [0, 1, 10];
        for (let i = cmap.numTables - 1; i >= 0; i -= 1) {
          platformId = parse_default.getUShort(data, start + 4 + i * 8);
          encodingId = parse_default.getUShort(data, start + 4 + i * 8 + 2);
          if (platformId === 3 && platform3Encodings.includes(encodingId) || platformId === 0 && platform0Encodings.includes(encodingId) || platformId === 1 && encodingId === 0) {
            if (offset > 0) continue;
            offset = parse_default.getULong(data, start + 4 + i * 8 + 4);
            if (format14Parser) {
              break;
            }
          } else if (platformId === 0 && encodingId === 5) {
            format14offset = parse_default.getULong(data, start + 4 + i * 8 + 4);
            format14Parser = new parse_default.Parser(data, start + format14offset);
            if (format14Parser.parseUShort() !== 14) {
              format14offset = -1;
              format14Parser = null;
            } else if (offset > 0) {
              break;
            }
          }
        }
        if (offset === -1) {
          throw new Error("No valid cmap sub-tables found.");
        }
        const p = new parse_default.Parser(data, start + offset);
        cmap.format = p.parseUShort();
        if (cmap.format === 0) {
          parseCmapTableFormat0(cmap, p, platformId, encodingId);
        } else if (cmap.format === 12 || cmap.format === 13) {
          parseCmapTableFormat12or13(cmap, p, cmap.format);
        } else if (cmap.format === 4) {
          parseCmapTableFormat4(cmap, p, data, start, offset);
        } else {
          throw new Error(
            "Only format 0 (platformId 1, encodingId 0), 4, 12 and 14 cmap tables are supported (found format " + cmap.format + ", platformId " + platformId + ", encodingId " + encodingId + ")."
          );
        }
        if (format14Parser) {
          parseCmapTableFormat14(cmap, format14Parser);
        }
        return cmap;
      }
      function addSegment(t, code, glyphIndex) {
        t.segments.push({
          end: code,
          start: code,
          delta: -(code - glyphIndex),
          offset: 0,
          glyphIndex
        });
      }
      function addTerminatorSegment(t) {
        t.segments.push({
          end: 65535,
          start: 65535,
          delta: 1,
          offset: 0
        });
      }
      function mergeSegments(segments) {
        if (segments.length === 0) return segments;
        const merged = [segments[0]];
        for (let i = 1; i < segments.length; i++) {
          const prev = merged[merged.length - 1];
          const curr = segments[i];
          if (prev.end + 1 === curr.start && prev.delta === curr.delta && curr.end !== 65535) {
            prev.end = curr.end;
          } else {
            merged.push(curr);
          }
        }
        return merged;
      }
      function makeCmapTable(glyphs) {
        let isPlan0Only = true;
        let i;
        for (i = glyphs.length - 1; i > 0; i -= 1) {
          const g = glyphs.get(i);
          if (g.unicode > 65535) {
            isPlan0Only = false;
            break;
          }
        }
        let cmapTable = [
          { name: "version", type: "USHORT", value: 0 },
          { name: "numTables", type: "USHORT", value: isPlan0Only ? 1 : 2 },
          // CMAP 4 header
          { name: "platformID", type: "USHORT", value: 3 },
          { name: "encodingID", type: "USHORT", value: 1 },
          { name: "offset", type: "ULONG", value: isPlan0Only ? 12 : 12 + 8 }
        ];
        if (!isPlan0Only)
          cmapTable.push(...[
            // CMAP 12 header
            { name: "cmap12PlatformID", type: "USHORT", value: 3 },
            // We encode only for PlatformID = 3 (Windows) because it is supported everywhere
            { name: "cmap12EncodingID", type: "USHORT", value: 10 },
            { name: "cmap12Offset", type: "ULONG", value: 0 }
          ]);
        cmapTable.push(...[
          // CMAP 4 Subtable
          { name: "format", type: "USHORT", value: 4 },
          { name: "cmap4Length", type: "USHORT", value: 0 },
          { name: "language", type: "USHORT", value: 0 },
          { name: "segCountX2", type: "USHORT", value: 0 },
          { name: "searchRange", type: "USHORT", value: 0 },
          { name: "entrySelector", type: "USHORT", value: 0 },
          { name: "rangeShift", type: "USHORT", value: 0 }
        ]);
        const t = new table_default.Table("cmap", cmapTable);
        t.segments = [];
        for (i = 0; i < glyphs.length; i += 1) {
          const glyph = glyphs.get(i);
          for (let j = 0; j < glyph.unicodes.length; j += 1) {
            addSegment(t, glyph.unicodes[j], i);
          }
        }
        t.segments.sort(function(a, b) {
          return a.start - b.start;
        });
        t.segments = mergeSegments(t.segments);
        addTerminatorSegment(t);
        const segCount = t.segments.length;
        let segCountToRemove = 0;
        let endCounts = [];
        let startCounts = [];
        let idDeltas = [];
        let idRangeOffsets = [];
        let glyphIds = [];
        let cmap12Groups = [];
        for (i = 0; i < segCount; i += 1) {
          const segment = t.segments[i];
          if (segment.end <= 65535 && segment.start <= 65535) {
            endCounts.push({ name: "end_" + i, type: "USHORT", value: segment.end });
            startCounts.push({ name: "start_" + i, type: "USHORT", value: segment.start });
            idDeltas.push({ name: "idDelta_" + i, type: "SHORT", value: segment.delta });
            idRangeOffsets.push({ name: "idRangeOffset_" + i, type: "USHORT", value: segment.offset });
            if (segment.glyphId !== void 0) {
              glyphIds.push({ name: "glyph_" + i, type: "USHORT", value: segment.glyphId });
            }
          } else {
            segCountToRemove += 1;
          }
          if (!isPlan0Only && segment.glyphIndex !== void 0) {
            cmap12Groups.push({ name: "cmap12Start_" + i, type: "ULONG", value: segment.start });
            cmap12Groups.push({ name: "cmap12End_" + i, type: "ULONG", value: segment.end });
            cmap12Groups.push({ name: "cmap12Glyph_" + i, type: "ULONG", value: segment.glyphIndex });
          }
        }
        t.segCountX2 = (segCount - segCountToRemove) * 2;
        t.searchRange = Math.pow(2, Math.floor(Math.log(segCount - segCountToRemove) / Math.log(2))) * 2;
        t.entrySelector = Math.log(t.searchRange / 2) / Math.log(2);
        t.rangeShift = t.segCountX2 - t.searchRange;
        for (let i2 = 0; i2 < endCounts.length; i2++) {
          t.fields.push(endCounts[i2]);
        }
        t.fields.push({ name: "reservedPad", type: "USHORT", value: 0 });
        for (let i2 = 0; i2 < startCounts.length; i2++) {
          t.fields.push(startCounts[i2]);
        }
        for (let i2 = 0; i2 < idDeltas.length; i2++) {
          t.fields.push(idDeltas[i2]);
        }
        for (let i2 = 0; i2 < idRangeOffsets.length; i2++) {
          t.fields.push(idRangeOffsets[i2]);
        }
        for (let i2 = 0; i2 < glyphIds.length; i2++) {
          t.fields.push(glyphIds[i2]);
        }
        t.cmap4Length = 14 + // Subtable header
        endCounts.length * 2 + 2 + // reservedPad
        startCounts.length * 2 + idDeltas.length * 2 + idRangeOffsets.length * 2 + glyphIds.length * 2;
        if (!isPlan0Only) {
          const cmap12Length = 16 + // Subtable header
          cmap12Groups.length * 4;
          t.cmap12Offset = 12 + 2 * 2 + 4 + t.cmap4Length;
          t.fields.push(...[
            { name: "cmap12Format", type: "USHORT", value: 12 },
            { name: "cmap12Reserved", type: "USHORT", value: 0 },
            { name: "cmap12Length", type: "ULONG", value: cmap12Length },
            { name: "cmap12Language", type: "ULONG", value: 0 },
            { name: "cmap12nGroups", type: "ULONG", value: cmap12Groups.length / 3 }
          ]);
          for (let i2 = 0; i2 < cmap12Groups.length; i2++) {
            t.fields.push(cmap12Groups[i2]);
          }
        }
        return t;
      }
      var cmap_default = { parse: parseCmapTable, make: makeCmapTable };
      var cffStandardStrings = [
        ".notdef",
        "space",
        "exclam",
        "quotedbl",
        "numbersign",
        "dollar",
        "percent",
        "ampersand",
        "quoteright",
        "parenleft",
        "parenright",
        "asterisk",
        "plus",
        "comma",
        "hyphen",
        "period",
        "slash",
        "zero",
        "one",
        "two",
        "three",
        "four",
        "five",
        "six",
        "seven",
        "eight",
        "nine",
        "colon",
        "semicolon",
        "less",
        "equal",
        "greater",
        "question",
        "at",
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
        "G",
        "H",
        "I",
        "J",
        "K",
        "L",
        "M",
        "N",
        "O",
        "P",
        "Q",
        "R",
        "S",
        "T",
        "U",
        "V",
        "W",
        "X",
        "Y",
        "Z",
        "bracketleft",
        "backslash",
        "bracketright",
        "asciicircum",
        "underscore",
        "quoteleft",
        "a",
        "b",
        "c",
        "d",
        "e",
        "f",
        "g",
        "h",
        "i",
        "j",
        "k",
        "l",
        "m",
        "n",
        "o",
        "p",
        "q",
        "r",
        "s",
        "t",
        "u",
        "v",
        "w",
        "x",
        "y",
        "z",
        "braceleft",
        "bar",
        "braceright",
        "asciitilde",
        "exclamdown",
        "cent",
        "sterling",
        "fraction",
        "yen",
        "florin",
        "section",
        "currency",
        "quotesingle",
        "quotedblleft",
        "guillemotleft",
        "guilsinglleft",
        "guilsinglright",
        "fi",
        "fl",
        "endash",
        "dagger",
        "daggerdbl",
        "periodcentered",
        "paragraph",
        "bullet",
        "quotesinglbase",
        "quotedblbase",
        "quotedblright",
        "guillemotright",
        "ellipsis",
        "perthousand",
        "questiondown",
        "grave",
        "acute",
        "circumflex",
        "tilde",
        "macron",
        "breve",
        "dotaccent",
        "dieresis",
        "ring",
        "cedilla",
        "hungarumlaut",
        "ogonek",
        "caron",
        "emdash",
        "AE",
        "ordfeminine",
        "Lslash",
        "Oslash",
        "OE",
        "ordmasculine",
        "ae",
        "dotlessi",
        "lslash",
        "oslash",
        "oe",
        "germandbls",
        "onesuperior",
        "logicalnot",
        "mu",
        "trademark",
        "Eth",
        "onehalf",
        "plusminus",
        "Thorn",
        "onequarter",
        "divide",
        "brokenbar",
        "degree",
        "thorn",
        "threequarters",
        "twosuperior",
        "registered",
        "minus",
        "eth",
        "multiply",
        "threesuperior",
        "copyright",
        "Aacute",
        "Acircumflex",
        "Adieresis",
        "Agrave",
        "Aring",
        "Atilde",
        "Ccedilla",
        "Eacute",
        "Ecircumflex",
        "Edieresis",
        "Egrave",
        "Iacute",
        "Icircumflex",
        "Idieresis",
        "Igrave",
        "Ntilde",
        "Oacute",
        "Ocircumflex",
        "Odieresis",
        "Ograve",
        "Otilde",
        "Scaron",
        "Uacute",
        "Ucircumflex",
        "Udieresis",
        "Ugrave",
        "Yacute",
        "Ydieresis",
        "Zcaron",
        "aacute",
        "acircumflex",
        "adieresis",
        "agrave",
        "aring",
        "atilde",
        "ccedilla",
        "eacute",
        "ecircumflex",
        "edieresis",
        "egrave",
        "iacute",
        "icircumflex",
        "idieresis",
        "igrave",
        "ntilde",
        "oacute",
        "ocircumflex",
        "odieresis",
        "ograve",
        "otilde",
        "scaron",
        "uacute",
        "ucircumflex",
        "udieresis",
        "ugrave",
        "yacute",
        "ydieresis",
        "zcaron",
        "exclamsmall",
        "Hungarumlautsmall",
        "dollaroldstyle",
        "dollarsuperior",
        "ampersandsmall",
        "Acutesmall",
        "parenleftsuperior",
        "parenrightsuperior",
        "266 ff",
        "onedotenleader",
        "zerooldstyle",
        "oneoldstyle",
        "twooldstyle",
        "threeoldstyle",
        "fouroldstyle",
        "fiveoldstyle",
        "sixoldstyle",
        "sevenoldstyle",
        "eightoldstyle",
        "nineoldstyle",
        "commasuperior",
        "threequartersemdash",
        "periodsuperior",
        "questionsmall",
        "asuperior",
        "bsuperior",
        "centsuperior",
        "dsuperior",
        "esuperior",
        "isuperior",
        "lsuperior",
        "msuperior",
        "nsuperior",
        "osuperior",
        "rsuperior",
        "ssuperior",
        "tsuperior",
        "ff",
        "ffi",
        "ffl",
        "parenleftinferior",
        "parenrightinferior",
        "Circumflexsmall",
        "hyphensuperior",
        "Gravesmall",
        "Asmall",
        "Bsmall",
        "Csmall",
        "Dsmall",
        "Esmall",
        "Fsmall",
        "Gsmall",
        "Hsmall",
        "Ismall",
        "Jsmall",
        "Ksmall",
        "Lsmall",
        "Msmall",
        "Nsmall",
        "Osmall",
        "Psmall",
        "Qsmall",
        "Rsmall",
        "Ssmall",
        "Tsmall",
        "Usmall",
        "Vsmall",
        "Wsmall",
        "Xsmall",
        "Ysmall",
        "Zsmall",
        "colonmonetary",
        "onefitted",
        "rupiah",
        "Tildesmall",
        "exclamdownsmall",
        "centoldstyle",
        "Lslashsmall",
        "Scaronsmall",
        "Zcaronsmall",
        "Dieresissmall",
        "Brevesmall",
        "Caronsmall",
        "Dotaccentsmall",
        "Macronsmall",
        "figuredash",
        "hypheninferior",
        "Ogoneksmall",
        "Ringsmall",
        "Cedillasmall",
        "questiondownsmall",
        "oneeighth",
        "threeeighths",
        "fiveeighths",
        "seveneighths",
        "onethird",
        "twothirds",
        "zerosuperior",
        "foursuperior",
        "fivesuperior",
        "sixsuperior",
        "sevensuperior",
        "eightsuperior",
        "ninesuperior",
        "zeroinferior",
        "oneinferior",
        "twoinferior",
        "threeinferior",
        "fourinferior",
        "fiveinferior",
        "sixinferior",
        "seveninferior",
        "eightinferior",
        "nineinferior",
        "centinferior",
        "dollarinferior",
        "periodinferior",
        "commainferior",
        "Agravesmall",
        "Aacutesmall",
        "Acircumflexsmall",
        "Atildesmall",
        "Adieresissmall",
        "Aringsmall",
        "AEsmall",
        "Ccedillasmall",
        "Egravesmall",
        "Eacutesmall",
        "Ecircumflexsmall",
        "Edieresissmall",
        "Igravesmall",
        "Iacutesmall",
        "Icircumflexsmall",
        "Idieresissmall",
        "Ethsmall",
        "Ntildesmall",
        "Ogravesmall",
        "Oacutesmall",
        "Ocircumflexsmall",
        "Otildesmall",
        "Odieresissmall",
        "OEsmall",
        "Oslashsmall",
        "Ugravesmall",
        "Uacutesmall",
        "Ucircumflexsmall",
        "Udieresissmall",
        "Yacutesmall",
        "Thornsmall",
        "Ydieresissmall",
        "001.000",
        "001.001",
        "001.002",
        "001.003",
        "Black",
        "Bold",
        "Book",
        "Light",
        "Medium",
        "Regular",
        "Roman",
        "Semibold"
      ];
      var cffISOAdobeStrings = [
        ".notdef",
        "space",
        "exclam",
        "quotedbl",
        "numbersign",
        "dollar",
        "percent",
        "ampersand",
        "quoteright",
        "parenleft",
        "parenright",
        "asterisk",
        "plus",
        "comma",
        "hyphen",
        "period",
        "slash",
        "zero",
        "one",
        "two",
        "three",
        "four",
        "five",
        "six",
        "seven",
        "eight",
        "nine",
        "colon",
        "semicolon",
        "less",
        "equal",
        "greater",
        "question",
        "at",
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
        "G",
        "H",
        "I",
        "J",
        "K",
        "L",
        "M",
        "N",
        "O",
        "P",
        "Q",
        "R",
        "S",
        "T",
        "U",
        "V",
        "W",
        "X",
        "Y",
        "Z",
        "bracketleft",
        "backslash",
        "bracketright",
        "asciicircum",
        "underscore",
        "quoteleft",
        "a",
        "b",
        "c",
        "d",
        "e",
        "f",
        "g",
        "h",
        "i",
        "j",
        "k",
        "l",
        "m",
        "n",
        "o",
        "p",
        "q",
        "r",
        "s",
        "t",
        "u",
        "v",
        "w",
        "x",
        "y",
        "z",
        "braceleft",
        "bar",
        "braceright",
        "asciitilde",
        "exclamdown",
        "cent",
        "sterling",
        "fraction",
        "yen",
        "florin",
        "section",
        "currency",
        "quotesingle",
        "quotedblleft",
        "guillemotleft",
        "guilsinglleft",
        "guilsinglright",
        "fi",
        "fl",
        "endash",
        "dagger",
        "daggerdbl",
        "periodcentered",
        "paragraph",
        "bullet",
        "quotesinglbase",
        "quotedblbase",
        "quotedblright",
        "guillemotright",
        "ellipsis",
        "perthousand",
        "questiondown",
        "grave",
        "acute",
        "circumflex",
        "tilde",
        "macron",
        "breve",
        "dotaccent",
        "dieresis",
        "ring",
        "cedilla",
        "hungarumlaut",
        "ogonek",
        "caron",
        "emdash",
        "AE",
        "ordfeminine",
        "Lslash",
        "Oslash",
        "OE",
        "ordmasculine",
        "ae",
        "dotlessi",
        "lslash",
        "oslash",
        "oe",
        "germandbls",
        "onesuperior",
        "logicalnot",
        "mu",
        "trademark",
        "Eth",
        "onehalf",
        "plusminus",
        "Thorn",
        "onequarter",
        "divide",
        "brokenbar",
        "degree",
        "thorn",
        "threequarters",
        "twosuperior",
        "registered",
        "minus",
        "eth",
        "multiply",
        "threesuperior",
        "copyright",
        "Aacute",
        "Acircumflex",
        "Adieresis",
        "Agrave",
        "Aring",
        "Atilde",
        "Ccedilla",
        "Eacute",
        "Ecircumflex",
        "Edieresis",
        "Egrave",
        "Iacute",
        "Icircumflex",
        "Idieresis",
        "Igrave",
        "Ntilde",
        "Oacute",
        "Ocircumflex",
        "Odieresis",
        "Ograve",
        "Otilde",
        "Scaron",
        "Uacute",
        "Ucircumflex",
        "Udieresis",
        "Ugrave",
        "Yacute",
        "Ydieresis",
        "Zcaron",
        "aacute",
        "acircumflex",
        "adieresis",
        "agrave",
        "aring",
        "atilde",
        "ccedilla",
        "eacute",
        "ecircumflex",
        "edieresis",
        "egrave",
        "iacute",
        "icircumflex",
        "idieresis",
        "igrave",
        "ntilde",
        "oacute",
        "ocircumflex",
        "odieresis",
        "ograve",
        "otilde",
        "scaron",
        "uacute",
        "ucircumflex",
        "udieresis",
        "ugrave",
        "yacute",
        "ydieresis",
        "zcaron"
      ];
      var cffIExpertStrings = [
        ".notdef",
        "space",
        "exclamsmall",
        "Hungarumlautsmall",
        "dollaroldstyle",
        "dollarsuperior",
        "ampersandsmall",
        "Acutesmall",
        "parenleftsuperior",
        "parenrightsuperior",
        "twodotenleader",
        "onedotenleader",
        "comma",
        "hyphen",
        "period",
        "fraction",
        "zerooldstyle",
        "oneoldstyle",
        "twooldstyle",
        "threeoldstyle",
        "fouroldstyle",
        "fiveoldstyle",
        "sixoldstyle",
        "sevenoldstyle",
        "eightoldstyle",
        "nineoldstyle",
        "colon",
        "semicolon",
        "commasuperior",
        "threequartersemdash",
        "periodsuperior",
        "questionsmall",
        "asuperior",
        "bsuperior",
        "centsuperior",
        "dsuperior",
        "esuperior",
        "isuperior",
        "lsuperior",
        "msuperior",
        "nsuperior",
        "osuperior",
        "rsuperior",
        "ssuperior",
        "tsuperior",
        "ff",
        "fi",
        "fl",
        "ffi",
        "ffl",
        "parenleftinferior",
        "parenrightinferior",
        "Circumflexsmall",
        "hyphensuperior",
        "Gravesmall",
        "Asmall",
        "Bsmall",
        "Csmall",
        "Dsmall",
        "Esmall",
        "Fsmall",
        "Gsmall",
        "Hsmall",
        "Ismall",
        "Jsmall",
        "Ksmall",
        "Lsmall",
        "Msmall",
        "Nsmall",
        "Osmall",
        "Psmall",
        "Qsmall",
        "Rsmall",
        "Ssmall",
        "Tsmall",
        "Usmall",
        "Vsmall",
        "Wsmall",
        "Xsmall",
        "Ysmall",
        "Zsmall",
        "colonmonetary",
        "onefitted",
        "rupiah",
        "Tildesmall",
        "exclamdownsmall",
        "centoldstyle",
        "Lslashsmall",
        "Scaronsmall",
        "Zcaronsmall",
        "Dieresissmall",
        "Brevesmall",
        "Caronsmall",
        "Dotaccentsmall",
        "Macronsmall",
        "figuredash",
        "hypheninferior",
        "Ogoneksmall",
        "Ringsmall",
        "Cedillasmall",
        "onequarter",
        "onehalf",
        "threequarters",
        "questiondownsmall",
        "oneeighth",
        "threeeighths",
        "fiveeighths",
        "seveneighths",
        "onethird",
        "twothirds",
        "zerosuperior",
        "onesuperior",
        "twosuperior",
        "threesuperior",
        "foursuperior",
        "fivesuperior",
        "sixsuperior",
        "sevensuperior",
        "eightsuperior",
        "ninesuperior",
        "zeroinferior",
        "oneinferior",
        "twoinferior",
        "threeinferior",
        "fourinferior",
        "fiveinferior",
        "sixinferior",
        "seveninferior",
        "eightinferior",
        "nineinferior",
        "centinferior",
        "dollarinferior",
        "periodinferior",
        "commainferior",
        "Agravesmall",
        "Aacutesmall",
        "Acircumflexsmall",
        "Atildesmall",
        "Adieresissmall",
        "Aringsmall",
        "AEsmall",
        "Ccedillasmall",
        "Egravesmall",
        "Eacutesmall",
        "Ecircumflexsmall",
        "Edieresissmall",
        "Igravesmall",
        "Iacutesmall",
        "Icircumflexsmall",
        "Idieresissmall",
        "Ethsmall",
        "Ntildesmall",
        "Ogravesmall",
        "Oacutesmall",
        "Ocircumflexsmall",
        "Otildesmall",
        "Odieresissmall",
        "OEsmall",
        "Oslashsmall",
        "Ugravesmall",
        "Uacutesmall",
        "Ucircumflexsmall",
        "Udieresissmall",
        "Yacutesmall",
        "Thornsmall",
        "Ydieresissmall"
      ];
      var cffExpertSubsetStrings = [
        ".notdef",
        "space",
        "dollaroldstyle",
        "dollarsuperior",
        "parenleftsuperior",
        "parenrightsuperior",
        "twodotenleader",
        "onedotenleader",
        "comma",
        "hyphen",
        "period",
        "fraction",
        "zerooldstyle",
        "oneoldstyle",
        "twooldstyle",
        "threeoldstyle",
        "fouroldstyle",
        "fiveoldstyle",
        "sixoldstyle",
        "sevenoldstyle",
        "eightoldstyle",
        "nineoldstyle",
        "colon",
        "semicolon",
        "commasuperior",
        "threequartersemdash",
        "periodsuperior",
        "asuperior",
        "bsuperior",
        "centsuperior",
        "dsuperior",
        "esuperior",
        "isuperior",
        "lsuperior",
        "msuperior",
        "nsuperior",
        "osuperior",
        "rsuperior",
        "ssuperior",
        "tsuperior",
        "ff",
        "fi",
        "fl",
        "ffi",
        "ffl",
        "parenleftinferior",
        "parenrightinferior",
        "hyphensuperior",
        "colonmonetary",
        "onefitted",
        "rupiah",
        "centoldstyle",
        "figuredash",
        "hypheninferior",
        "onequarter",
        "onehalf",
        "threequarters",
        "oneeighth",
        "threeeighths",
        "fiveeighths",
        "seveneighths",
        "onethird",
        "twothirds",
        "zerosuperior",
        "onesuperior",
        "twosuperior",
        "threesuperior",
        "foursuperior",
        "fivesuperior",
        "sixsuperior",
        "sevensuperior",
        "eightsuperior",
        "ninesuperior",
        "zeroinferior",
        "oneinferior",
        "twoinferior",
        "threeinferior",
        "fourinferior",
        "fiveinferior",
        "sixinferior",
        "seveninferior",
        "eightinferior",
        "nineinferior",
        "centinferior",
        "dollarinferior",
        "periodinferior",
        "commainferior"
      ];
      var cffStandardEncoding = [
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "space",
        "exclam",
        "quotedbl",
        "numbersign",
        "dollar",
        "percent",
        "ampersand",
        "quoteright",
        "parenleft",
        "parenright",
        "asterisk",
        "plus",
        "comma",
        "hyphen",
        "period",
        "slash",
        "zero",
        "one",
        "two",
        "three",
        "four",
        "five",
        "six",
        "seven",
        "eight",
        "nine",
        "colon",
        "semicolon",
        "less",
        "equal",
        "greater",
        "question",
        "at",
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
        "G",
        "H",
        "I",
        "J",
        "K",
        "L",
        "M",
        "N",
        "O",
        "P",
        "Q",
        "R",
        "S",
        "T",
        "U",
        "V",
        "W",
        "X",
        "Y",
        "Z",
        "bracketleft",
        "backslash",
        "bracketright",
        "asciicircum",
        "underscore",
        "quoteleft",
        "a",
        "b",
        "c",
        "d",
        "e",
        "f",
        "g",
        "h",
        "i",
        "j",
        "k",
        "l",
        "m",
        "n",
        "o",
        "p",
        "q",
        "r",
        "s",
        "t",
        "u",
        "v",
        "w",
        "x",
        "y",
        "z",
        "braceleft",
        "bar",
        "braceright",
        "asciitilde",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "exclamdown",
        "cent",
        "sterling",
        "fraction",
        "yen",
        "florin",
        "section",
        "currency",
        "quotesingle",
        "quotedblleft",
        "guillemotleft",
        "guilsinglleft",
        "guilsinglright",
        "fi",
        "fl",
        "",
        "endash",
        "dagger",
        "daggerdbl",
        "periodcentered",
        "",
        "paragraph",
        "bullet",
        "quotesinglbase",
        "quotedblbase",
        "quotedblright",
        "guillemotright",
        "ellipsis",
        "perthousand",
        "",
        "questiondown",
        "",
        "grave",
        "acute",
        "circumflex",
        "tilde",
        "macron",
        "breve",
        "dotaccent",
        "dieresis",
        "",
        "ring",
        "cedilla",
        "",
        "hungarumlaut",
        "ogonek",
        "caron",
        "emdash",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "AE",
        "",
        "ordfeminine",
        "",
        "",
        "",
        "",
        "Lslash",
        "Oslash",
        "OE",
        "ordmasculine",
        "",
        "",
        "",
        "",
        "",
        "ae",
        "",
        "",
        "",
        "dotlessi",
        "",
        "",
        "lslash",
        "oslash",
        "oe",
        "germandbls"
      ];
      var cffExpertEncoding = [
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "space",
        "exclamsmall",
        "Hungarumlautsmall",
        "",
        "dollaroldstyle",
        "dollarsuperior",
        "ampersandsmall",
        "Acutesmall",
        "parenleftsuperior",
        "parenrightsuperior",
        "twodotenleader",
        "onedotenleader",
        "comma",
        "hyphen",
        "period",
        "fraction",
        "zerooldstyle",
        "oneoldstyle",
        "twooldstyle",
        "threeoldstyle",
        "fouroldstyle",
        "fiveoldstyle",
        "sixoldstyle",
        "sevenoldstyle",
        "eightoldstyle",
        "nineoldstyle",
        "colon",
        "semicolon",
        "commasuperior",
        "threequartersemdash",
        "periodsuperior",
        "questionsmall",
        "",
        "asuperior",
        "bsuperior",
        "centsuperior",
        "dsuperior",
        "esuperior",
        "",
        "",
        "isuperior",
        "",
        "",
        "lsuperior",
        "msuperior",
        "nsuperior",
        "osuperior",
        "",
        "",
        "rsuperior",
        "ssuperior",
        "tsuperior",
        "",
        "ff",
        "fi",
        "fl",
        "ffi",
        "ffl",
        "parenleftinferior",
        "",
        "parenrightinferior",
        "Circumflexsmall",
        "hyphensuperior",
        "Gravesmall",
        "Asmall",
        "Bsmall",
        "Csmall",
        "Dsmall",
        "Esmall",
        "Fsmall",
        "Gsmall",
        "Hsmall",
        "Ismall",
        "Jsmall",
        "Ksmall",
        "Lsmall",
        "Msmall",
        "Nsmall",
        "Osmall",
        "Psmall",
        "Qsmall",
        "Rsmall",
        "Ssmall",
        "Tsmall",
        "Usmall",
        "Vsmall",
        "Wsmall",
        "Xsmall",
        "Ysmall",
        "Zsmall",
        "colonmonetary",
        "onefitted",
        "rupiah",
        "Tildesmall",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "exclamdownsmall",
        "centoldstyle",
        "Lslashsmall",
        "",
        "",
        "Scaronsmall",
        "Zcaronsmall",
        "Dieresissmall",
        "Brevesmall",
        "Caronsmall",
        "",
        "Dotaccentsmall",
        "",
        "",
        "Macronsmall",
        "",
        "",
        "figuredash",
        "hypheninferior",
        "",
        "",
        "Ogoneksmall",
        "Ringsmall",
        "Cedillasmall",
        "",
        "",
        "",
        "onequarter",
        "onehalf",
        "threequarters",
        "questiondownsmall",
        "oneeighth",
        "threeeighths",
        "fiveeighths",
        "seveneighths",
        "onethird",
        "twothirds",
        "",
        "",
        "zerosuperior",
        "onesuperior",
        "twosuperior",
        "threesuperior",
        "foursuperior",
        "fivesuperior",
        "sixsuperior",
        "sevensuperior",
        "eightsuperior",
        "ninesuperior",
        "zeroinferior",
        "oneinferior",
        "twoinferior",
        "threeinferior",
        "fourinferior",
        "fiveinferior",
        "sixinferior",
        "seveninferior",
        "eightinferior",
        "nineinferior",
        "centinferior",
        "dollarinferior",
        "periodinferior",
        "commainferior",
        "Agravesmall",
        "Aacutesmall",
        "Acircumflexsmall",
        "Atildesmall",
        "Adieresissmall",
        "Aringsmall",
        "AEsmall",
        "Ccedillasmall",
        "Egravesmall",
        "Eacutesmall",
        "Ecircumflexsmall",
        "Edieresissmall",
        "Igravesmall",
        "Iacutesmall",
        "Icircumflexsmall",
        "Idieresissmall",
        "Ethsmall",
        "Ntildesmall",
        "Ogravesmall",
        "Oacutesmall",
        "Ocircumflexsmall",
        "Otildesmall",
        "Odieresissmall",
        "OEsmall",
        "Oslashsmall",
        "Ugravesmall",
        "Uacutesmall",
        "Ucircumflexsmall",
        "Udieresissmall",
        "Yacutesmall",
        "Thornsmall",
        "Ydieresissmall"
      ];
      var standardNames = [
        ".notdef",
        ".null",
        "nonmarkingreturn",
        "space",
        "exclam",
        "quotedbl",
        "numbersign",
        "dollar",
        "percent",
        "ampersand",
        "quotesingle",
        "parenleft",
        "parenright",
        "asterisk",
        "plus",
        "comma",
        "hyphen",
        "period",
        "slash",
        "zero",
        "one",
        "two",
        "three",
        "four",
        "five",
        "six",
        "seven",
        "eight",
        "nine",
        "colon",
        "semicolon",
        "less",
        "equal",
        "greater",
        "question",
        "at",
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
        "G",
        "H",
        "I",
        "J",
        "K",
        "L",
        "M",
        "N",
        "O",
        "P",
        "Q",
        "R",
        "S",
        "T",
        "U",
        "V",
        "W",
        "X",
        "Y",
        "Z",
        "bracketleft",
        "backslash",
        "bracketright",
        "asciicircum",
        "underscore",
        "grave",
        "a",
        "b",
        "c",
        "d",
        "e",
        "f",
        "g",
        "h",
        "i",
        "j",
        "k",
        "l",
        "m",
        "n",
        "o",
        "p",
        "q",
        "r",
        "s",
        "t",
        "u",
        "v",
        "w",
        "x",
        "y",
        "z",
        "braceleft",
        "bar",
        "braceright",
        "asciitilde",
        "Adieresis",
        "Aring",
        "Ccedilla",
        "Eacute",
        "Ntilde",
        "Odieresis",
        "Udieresis",
        "aacute",
        "agrave",
        "acircumflex",
        "adieresis",
        "atilde",
        "aring",
        "ccedilla",
        "eacute",
        "egrave",
        "ecircumflex",
        "edieresis",
        "iacute",
        "igrave",
        "icircumflex",
        "idieresis",
        "ntilde",
        "oacute",
        "ograve",
        "ocircumflex",
        "odieresis",
        "otilde",
        "uacute",
        "ugrave",
        "ucircumflex",
        "udieresis",
        "dagger",
        "degree",
        "cent",
        "sterling",
        "section",
        "bullet",
        "paragraph",
        "germandbls",
        "registered",
        "copyright",
        "trademark",
        "acute",
        "dieresis",
        "notequal",
        "AE",
        "Oslash",
        "infinity",
        "plusminus",
        "lessequal",
        "greaterequal",
        "yen",
        "mu",
        "partialdiff",
        "summation",
        "product",
        "pi",
        "integral",
        "ordfeminine",
        "ordmasculine",
        "Omega",
        "ae",
        "oslash",
        "questiondown",
        "exclamdown",
        "logicalnot",
        "radical",
        "florin",
        "approxequal",
        "Delta",
        "guillemotleft",
        "guillemotright",
        "ellipsis",
        "nonbreakingspace",
        "Agrave",
        "Atilde",
        "Otilde",
        "OE",
        "oe",
        "endash",
        "emdash",
        "quotedblleft",
        "quotedblright",
        "quoteleft",
        "quoteright",
        "divide",
        "lozenge",
        "ydieresis",
        "Ydieresis",
        "fraction",
        "currency",
        "guilsinglleft",
        "guilsinglright",
        "fi",
        "fl",
        "daggerdbl",
        "periodcentered",
        "quotesinglbase",
        "quotedblbase",
        "perthousand",
        "Acircumflex",
        "Ecircumflex",
        "Aacute",
        "Edieresis",
        "Egrave",
        "Iacute",
        "Icircumflex",
        "Idieresis",
        "Igrave",
        "Oacute",
        "Ocircumflex",
        "apple",
        "Ograve",
        "Uacute",
        "Ucircumflex",
        "Ugrave",
        "dotlessi",
        "circumflex",
        "tilde",
        "macron",
        "breve",
        "dotaccent",
        "ring",
        "cedilla",
        "hungarumlaut",
        "ogonek",
        "caron",
        "Lslash",
        "lslash",
        "Scaron",
        "scaron",
        "Zcaron",
        "zcaron",
        "brokenbar",
        "Eth",
        "eth",
        "Yacute",
        "yacute",
        "Thorn",
        "thorn",
        "minus",
        "multiply",
        "onesuperior",
        "twosuperior",
        "threesuperior",
        "onehalf",
        "onequarter",
        "threequarters",
        "franc",
        "Gbreve",
        "gbreve",
        "Idotaccent",
        "Scedilla",
        "scedilla",
        "Cacute",
        "cacute",
        "Ccaron",
        "ccaron",
        "dcroat"
      ];
      function DefaultEncoding(font) {
        this.font = font;
      }
      DefaultEncoding.prototype.charToGlyphIndex = function(c) {
        const code = c.codePointAt(0);
        const glyphs = this.font.glyphs;
        if (glyphs) {
          for (let i = 0; i < glyphs.length; i += 1) {
            const glyph = glyphs.get(i);
            for (let j = 0; j < glyph.unicodes.length; j += 1) {
              if (glyph.unicodes[j] === code) {
                return i;
              }
            }
          }
        }
        return null;
      };
      function CmapEncoding(cmap) {
        this.cmap = cmap;
      }
      CmapEncoding.prototype.charToGlyphIndex = function(c) {
        return this.cmap.glyphIndexMap[c.codePointAt(0)] || 0;
      };
      function CffEncoding(encoding, charset) {
        this.encoding = encoding;
        this.charset = charset;
      }
      CffEncoding.prototype.charToGlyphIndex = function(s) {
        const code = s.codePointAt(0);
        const charName = this.encoding[code];
        return this.charset.indexOf(charName);
      };
      function GlyphNames(post) {
        switch (post.version) {
          case 1:
            this.names = standardNames.slice();
            break;
          case 2:
            this.names = new Array(post.numberOfGlyphs);
            for (let i = 0; i < post.numberOfGlyphs; i++) {
              if (post.glyphNameIndex[i] < standardNames.length) {
                this.names[i] = standardNames[post.glyphNameIndex[i]];
              } else {
                this.names[i] = post.names[post.glyphNameIndex[i] - standardNames.length];
              }
            }
            break;
          case 2.5:
            this.names = new Array(post.numberOfGlyphs);
            for (let i = 0; i < post.numberOfGlyphs; i++) {
              this.names[i] = standardNames[i + post.glyphNameIndex[i]];
            }
            break;
          case 3:
            this.names = [];
            break;
          default:
            this.names = [];
            break;
        }
      }
      GlyphNames.prototype.nameToGlyphIndex = function(name) {
        return this.names.indexOf(name);
      };
      GlyphNames.prototype.glyphIndexToName = function(gid) {
        return this.names[gid];
      };
      function addGlyphNamesAll(font) {
        let glyph;
        const glyphIndexMap = font.tables.cmap.glyphIndexMap;
        const charCodes = Object.keys(glyphIndexMap);
        for (let i = 0; i < charCodes.length; i += 1) {
          const c = charCodes[i];
          const glyphIndex = glyphIndexMap[c];
          glyph = font.glyphs.get(glyphIndex);
          glyph.addUnicode(parseInt(c));
        }
        for (let i = 0; i < font.glyphs.length; i += 1) {
          glyph = font.glyphs.get(i);
          if (font.cffEncoding) {
            glyph.name = font.cffEncoding.charset[i];
          } else if (font.glyphNames.names) {
            glyph.name = font.glyphNames.glyphIndexToName(i);
          }
        }
      }
      function addGlyphNamesToUnicodeMap(font) {
        font._IndexToUnicodeMap = {};
        const glyphIndexMap = font.tables.cmap.glyphIndexMap;
        const charCodes = Object.keys(glyphIndexMap);
        for (let i = 0; i < charCodes.length; i += 1) {
          const c = charCodes[i];
          let glyphIndex = glyphIndexMap[c];
          if (font._IndexToUnicodeMap[glyphIndex] === void 0) {
            font._IndexToUnicodeMap[glyphIndex] = {
              unicodes: [parseInt(c)]
            };
          } else {
            font._IndexToUnicodeMap[glyphIndex].unicodes.push(parseInt(c));
          }
        }
      }
      function addGlyphNames(font, opt) {
        if (opt.lowMemory) {
          addGlyphNamesToUnicodeMap(font);
        } else {
          addGlyphNamesAll(font);
        }
      }
      function line(ctx, x1, y1, x2, y2) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      var draw_default = { line };
      function parseCpalTable(data, start) {
        const p = new Parser(data, start);
        const version = p.parseShort();
        if (version !== 0) {
          console.warn("Only CPALv0 is currently fully supported.");
        }
        const numPaletteEntries = p.parseShort();
        const numPalettes = p.parseShort();
        const numColorRecords = p.parseShort();
        const colorRecordsArrayOffset = p.parseOffset32();
        const colorRecordIndices = p.parseUShortList(numPalettes);
        p.relativeOffset = colorRecordsArrayOffset;
        const colorRecords = p.parseULongList(numColorRecords);
        p.relativeOffset = colorRecordsArrayOffset;
        return {
          version,
          numPaletteEntries,
          colorRecords,
          colorRecordIndices
        };
      }
      function makeCpalTable({ version = 0, numPaletteEntries = 0, colorRecords = [], colorRecordIndices = [0] }) {
        check_default.argument(version === 0, "Only CPALv0 are supported.");
        check_default.argument(colorRecords.length, "No colorRecords given.");
        check_default.argument(colorRecordIndices.length, "No colorRecordIndices given.");
        if (colorRecordIndices.length > 1) {
          check_default.argument(numPaletteEntries, "Can't infer numPaletteEntries on multiple colorRecordIndices");
        }
        return new table_default.Table("CPAL", [
          { name: "version", type: "USHORT", value: version },
          { name: "numPaletteEntries", type: "USHORT", value: numPaletteEntries || colorRecords.length },
          { name: "numPalettes", type: "USHORT", value: colorRecordIndices.length },
          { name: "numColorRecords", type: "USHORT", value: colorRecords.length },
          { name: "colorRecordsArrayOffset", type: "ULONG", value: 12 + 2 * colorRecordIndices.length },
          ...colorRecordIndices.map((palette, i) => ({ name: "colorRecordIndices_" + i, type: "USHORT", value: palette })),
          ...colorRecords.map((color, i) => ({ name: "colorRecords_" + i, type: "ULONG", value: color }))
        ]);
      }
      function parseCPALColor(bgra) {
        var b = (bgra & 4278190080) >> 24;
        var g = (bgra & 16711680) >> 16;
        var r = (bgra & 65280) >> 8;
        var a = bgra & 255;
        b = b + 256 & 255;
        g = g + 256 & 255;
        r = r + 256 & 255;
        a = (a + 256 & 255) / 255;
        return { b, g, r, a };
      }
      function getPaletteColor(font, index, palette = 0, colorFormat = "hexa") {
        if (index == 65535) {
          return "currentColor";
        }
        const cpalTable = font && font.tables && font.tables.cpal;
        if (!cpalTable) return "currentColor";
        if (palette > cpalTable.colorRecordIndices.length - 1) {
          throw new Error(`Palette index out of range (colorRecordIndices.length: ${cpalTable.colorRecordIndices.length}, index: ${index})`);
        }
        if (index > cpalTable.numPaletteEntries) {
          throw new Error(`Color index out of range (numPaletteEntries: ${cpalTable.numPaletteEntries}, index: ${index})`);
        }
        const lookupIndex = cpalTable.colorRecordIndices[palette] + index;
        if (lookupIndex > cpalTable.colorRecords) {
          throw new Error(`Color index out of range (colorRecords.length: ${cpalTable.colorRecords.length}, lookupIndex: ${lookupIndex})`);
        }
        const color = parseCPALColor(cpalTable.colorRecords[lookupIndex]);
        if (colorFormat === "bgra") {
          return color;
        }
        return formatColor(color, colorFormat);
      }
      function toHex(d) {
        return ("0" + parseInt(d).toString(16)).slice(-2);
      }
      function rgbToHSL(bgra) {
        const r = bgra.r / 255;
        const g = bgra.g / 255;
        const b = bgra.b / 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        if (max === min) {
          h = s = 0;
        } else {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r:
              h = (g - b) / d + (g < b ? 6 : 0);
              break;
            case g:
              h = (b - r) / d + 2;
              break;
            case b:
              h = (r - g) / d + 4;
              break;
          }
          h /= 6;
        }
        return {
          h: h * 360,
          s: s * 100,
          l: l * 100
        };
      }
      function hslToRGB(hsla) {
        let { h, s, l, a } = hsla;
        h = h % 360;
        s /= 100;
        l /= 100;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs(h / 60 % 2 - 1));
        const m = l - c / 2;
        let r = 0, g = 0, b = 0;
        if (0 <= h && h < 60) {
          r = c;
          g = x;
          b = 0;
        } else if (60 <= h && h < 120) {
          r = x;
          g = c;
          b = 0;
        } else if (120 <= h && h < 180) {
          r = 0;
          g = c;
          b = x;
        } else if (180 <= h && h < 240) {
          r = 0;
          g = x;
          b = c;
        } else if (240 <= h && h < 300) {
          r = x;
          g = 0;
          b = c;
        } else if (300 <= h && h <= 360) {
          r = c;
          g = 0;
          b = x;
        }
        return {
          r: Math.round((r + m) * 255),
          g: Math.round((g + m) * 255),
          b: Math.round((b + m) * 255),
          a
        };
      }
      function bgraToRaw(color) {
        return parseInt(`0x${toHex(color.b)}${toHex(color.g)}${toHex(color.r)}${toHex(color.a * 255)}`, 16);
      }
      function parseColor(color, targetFormat = "hexa") {
        const returnRaw = targetFormat == "raw" || targetFormat == "cpal";
        const isRaw = Number.isInteger(color);
        let validFormat = true;
        if (isRaw && returnRaw || color === "currentColor") {
          return color;
        } else if (typeof color === "object") {
          if (targetFormat == "bgra") {
            return color;
          }
          if (returnRaw) {
            return bgraToRaw(color);
          }
        } else if (!isRaw && /^#([a-f0-9]{3}|[a-f0-9]{4}|[a-f0-9]{6}|[a-f0-9]{8})$/i.test(color.trim())) {
          color = color.trim().substring(1);
          switch (color.length) {
            case 3:
              color = {
                r: parseInt(color[0].repeat(2), 16),
                g: parseInt(color[1].repeat(2), 16),
                b: parseInt(color[2].repeat(2), 16),
                a: 1
              };
              break;
            case 4:
              color = {
                r: parseInt(color[0].repeat(2), 16),
                g: parseInt(color[1].repeat(2), 16),
                b: parseInt(color[2].repeat(2), 16),
                a: parseInt(color[3].repeat(2), 16) / 255
              };
              break;
            case 6:
              color = {
                r: parseInt(color[0] + color[1], 16),
                g: parseInt(color[2] + color[3], 16),
                b: parseInt(color[4] + color[5], 16),
                a: 1
              };
              break;
            case 8:
              color = {
                r: parseInt(color[0] + color[1], 16),
                g: parseInt(color[2] + color[3], 16),
                b: parseInt(color[4] + color[5], 16),
                a: parseInt(color[6] + color[7], 16) / 255
              };
              break;
          }
          if (targetFormat == "bgra") {
            return color;
          }
        } else if (typeof document !== "undefined" && /^[a-z]+$/i.test(color)) {
          const ctx = document.createElement("canvas").getContext("2d");
          ctx.fillStyle = color;
          const detectedColor = formatColor(ctx.fillStyle, "hexa");
          if (detectedColor === "#000000ff" && color.toLowerCase() !== "black") {
            validFormat = false;
          } else {
            color = detectedColor;
          }
        } else {
          color = color.trim();
          const rgbaRegex = /rgba?\(\s*(?:(\d*\.\d+)(%?)|(\d+)(%?))\s*(?:,|\s*)\s*(?:(\d*\.\d+)(%?)|(\d+)(%?))\s*(?:,|\s*)\s*(?:(\d*\.\d+)(%?)|(\d+)(%?))\s*(?:(?:,|\s|\/)\s*(?:(0*(?:\.\d+)?()|0*1(?:\.0+)?())|(?:\.\d+)|(\d+)(%)|(\d*\.\d+)(%)))?\s*\)/;
          if (rgbaRegex.test(color)) {
            const matches = color.match(rgbaRegex).filter((i) => typeof i !== "undefined");
            color = {
              r: Math.round(parseFloat(matches[1]) / (matches[2] ? 100 / 255 : 1)),
              g: Math.round(parseFloat(matches[3]) / (matches[4] ? 100 / 255 : 1)),
              b: Math.round(parseFloat(matches[5]) / (matches[6] ? 100 / 255 : 1)),
              a: !matches[7] ? 1 : parseFloat(matches[7]) / (matches[8] ? 100 : 1)
            };
          } else {
            const hslaRegex = /hsla?\(\s*(?:(\d*\.\d+|\d+)(deg|turn|))\s*(?:,|\s*)\s*(?:(\d*\.\d+)%?|(\d+)%?)\s*(?:,|\s*)\s*(?:(\d*\.\d+)%?|(\d+)%?)\s*(?:(?:,|\s|\/)\s*(?:(0*(?:\.\d+)?()|0*1(?:\.0+)?())|(?:\.\d+)|(\d+)(%)|(\d*\.\d+)(%)))?\s*\)/;
            if (hslaRegex.test(color)) {
              const matches = color.match(hslaRegex).filter((i) => typeof i !== "undefined");
              color = hslToRGB({
                h: parseFloat(matches[1]) * (matches[2] === "turn" ? 360 : 1),
                s: parseFloat(matches[3]),
                l: parseFloat(matches[4]),
                a: !matches[5] ? 1 : parseFloat(matches[5]) / (matches[6] ? 100 : 1)
              });
            } else {
              validFormat = false;
            }
          }
        }
        if (!validFormat) {
          throw new Error(`Invalid color format: ${color}`);
        }
        return formatColor(color, targetFormat);
      }
      function formatColor(bgra, format = "hexa") {
        if (bgra === "currentColor") return bgra;
        if (Number.isInteger(bgra)) {
          if (format == "raw" || format == "cpal") {
            return bgra;
          }
          bgra = parseCPALColor(bgra);
        } else if (typeof bgra !== "object") {
          bgra = parseColor(bgra, "bgra");
        }
        let hsl = ["hsl", "hsla"].includes(format) ? rgbToHSL(bgra) : null;
        switch (format) {
          case "rgba":
            return `rgba(${bgra.r}, ${bgra.g}, ${bgra.b}, ${parseFloat(bgra.a.toFixed(3))})`;
          case "rgb":
            return `rgb(${bgra.r}, ${bgra.g}, ${bgra.b})`;
          case "hex":
          case "hex6":
          case "hex-6":
            return `#${toHex(bgra.r)}${toHex(bgra.g)}${toHex(bgra.b)}`;
          case "hexa":
          case "hex8":
          case "hex-8":
            return `#${toHex(bgra.r)}${toHex(bgra.g)}${toHex(bgra.b)}${toHex(bgra.a * 255)}`;
          case "hsl":
            return `hsl(${hsl.h.toFixed(2)}, ${hsl.s.toFixed(2)}%, ${hsl.l.toFixed(2)}%)`;
          case "hsla":
            return `hsla(${hsl.h.toFixed(2)}, ${hsl.s.toFixed(2)}%, ${hsl.l.toFixed(2)}%, ${parseFloat(bgra.a.toFixed(3))})`;
          case "bgra":
            return bgra;
          case "raw":
          case "cpal":
            return bgraToRaw(bgra);
          default:
            throw new Error("Unknown color format: " + format);
        }
      }
      var cpal_default = { parse: parseCpalTable, make: makeCpalTable, getPaletteColor, parseColor, formatColor };
      function getPathDefinition(glyph, path2) {
        let _path = path2 || new path_default();
        return {
          configurable: true,
          get: function() {
            if (typeof _path === "function") {
              _path = _path();
            }
            return _path;
          },
          set: function(p) {
            _path = p;
          }
        };
      }
      function Glyph(options) {
        this.bindConstructorValues(options);
      }
      Glyph.prototype.bindConstructorValues = function(options) {
        this.index = options.index || 0;
        if (options.name === ".notdef") {
          options.unicode = void 0;
        } else if (options.name === ".null") {
          options.unicode = 0;
        }
        if (options.unicode === 0 && options.name !== ".null") {
          throw new Error('The unicode value "0" is reserved for the glyph name ".null" and cannot be used by any other glyph.');
        }
        this.name = options.name || null;
        this.unicode = options.unicode;
        this.unicodes = options.unicodes || (options.unicode !== void 0 ? [options.unicode] : []);
        if ("xMin" in options) {
          this.xMin = options.xMin;
        }
        if ("yMin" in options) {
          this.yMin = options.yMin;
        }
        if ("xMax" in options) {
          this.xMax = options.xMax;
        }
        if ("yMax" in options) {
          this.yMax = options.yMax;
        }
        if ("advanceWidth" in options) {
          this.advanceWidth = options.advanceWidth;
        }
        if ("leftSideBearing" in options) {
          this.leftSideBearing = options.leftSideBearing;
        }
        if ("points" in options) {
          this.points = options.points;
        }
        Object.defineProperty(this, "path", getPathDefinition(this, options.path));
      };
      Glyph.prototype.addUnicode = function(unicode) {
        if (this.unicodes.length === 0) {
          this.unicode = unicode;
        }
        this.unicodes.push(unicode);
      };
      Glyph.prototype.getBoundingBox = function() {
        return this.path.getBoundingBox();
      };
      Glyph.prototype.getPath = function(x, y, fontSize, options, font) {
        x = x !== void 0 ? x : 0;
        y = y !== void 0 ? y : 0;
        fontSize = fontSize !== void 0 ? fontSize : 72;
        options = Object.assign({}, font && font.defaultRenderOptions, options);
        let commands;
        let hPoints;
        let xScale = options.xScale;
        let yScale = options.yScale;
        const scale = 1 / (this.path.unitsPerEm || 1e3) * fontSize;
        let useGlyph = this;
        if (font && font.variation) {
          useGlyph = font.variation.getTransform(this, options.variation);
          commands = useGlyph.path.commands;
        }
        if (options.hinting && font && font.hinting) {
          hPoints = useGlyph.path && font.hinting.exec(useGlyph, fontSize, options);
        }
        if (hPoints) {
          commands = font.hinting.getCommands(hPoints);
          x = Math.round(x);
          y = Math.round(y);
          xScale = yScale = 1;
        } else {
          commands = useGlyph.path.commands;
          if (xScale === void 0) xScale = scale;
          if (yScale === void 0) yScale = scale;
        }
        const p = new path_default();
        if (options.drawSVG) {
          const svgImage = this.getSvgImage(font);
          if (svgImage) {
            const layer = new path_default();
            layer._image = {
              image: svgImage.image,
              x: x + svgImage.leftSideBearing * scale,
              y: y - svgImage.baseline * scale,
              width: svgImage.image.width * scale,
              height: svgImage.image.height * scale
            };
            p._layers = [layer];
            return p;
          }
        }
        if (options.drawLayers) {
          const layers = this.getLayers(font);
          if (layers && layers.length) {
            p._layers = [];
            for (let i = 0; i < layers.length; i += 1) {
              const layer = layers[i];
              let color = getPaletteColor(font, layer.paletteIndex, options.usePalette);
              if (color === "currentColor") {
                color = options.fill || "black";
              } else {
                color = formatColor(color, options.colorFormat || "rgba");
              }
              options = Object.assign({}, options, { fill: color });
              p._layers.push(this.getPath.call(layer.glyph, x, y, fontSize, options, font));
            }
            return p;
          }
        }
        p.fill = options.fill || this.path.fill;
        p.stroke = this.path.stroke;
        p.strokeWidth = this.path.strokeWidth * scale;
        for (let i = 0; i < commands.length; i += 1) {
          const cmd = commands[i];
          if (cmd.type === "M") {
            p.moveTo(x + cmd.x * xScale, y + -cmd.y * yScale);
          } else if (cmd.type === "L") {
            p.lineTo(x + cmd.x * xScale, y + -cmd.y * yScale);
          } else if (cmd.type === "Q") {
            p.quadraticCurveTo(
              x + cmd.x1 * xScale,
              y + -cmd.y1 * yScale,
              x + cmd.x * xScale,
              y + -cmd.y * yScale
            );
          } else if (cmd.type === "C") {
            p.curveTo(
              x + cmd.x1 * xScale,
              y + -cmd.y1 * yScale,
              x + cmd.x2 * xScale,
              y + -cmd.y2 * yScale,
              x + cmd.x * xScale,
              y + -cmd.y * yScale
            );
          } else if (cmd.type === "Z" && p.stroke && p.strokeWidth) {
            p.closePath();
          }
        }
        return p;
      };
      Glyph.prototype.getLayers = function(font) {
        if (!font) {
          throw new Error("The font object is required to read the colr/cpal tables in order to get the layers.");
        }
        return font.layers.get(this.index);
      };
      Glyph.prototype.getSvgImage = function(font) {
        if (!font) {
          throw new Error("The font object is required to read the svg table in order to get the image.");
        }
        return font.svgImages.get(this.index);
      };
      Glyph.prototype.getContours = function(transformedPoints = null) {
        if (this.points === void 0 && !transformedPoints) {
          return [];
        }
        const contours = [];
        let currentContour = [];
        let points = transformedPoints ? transformedPoints : this.points;
        for (let i = 0; i < points.length; i += 1) {
          const pt = points[i];
          currentContour.push(pt);
          if (pt.lastPointOfContour) {
            contours.push(currentContour);
            currentContour = [];
          }
        }
        check_default.argument(currentContour.length === 0, "There are still points left in the current contour.");
        return contours;
      };
      Glyph.prototype.getMetrics = function() {
        const commands = this.path.commands;
        const xCoords = [];
        const yCoords = [];
        for (let i = 0; i < commands.length; i += 1) {
          const cmd = commands[i];
          if (cmd.type !== "Z") {
            xCoords.push(cmd.x);
            yCoords.push(cmd.y);
          }
          if (cmd.type === "Q" || cmd.type === "C") {
            xCoords.push(cmd.x1);
            yCoords.push(cmd.y1);
          }
          if (cmd.type === "C") {
            xCoords.push(cmd.x2);
            yCoords.push(cmd.y2);
          }
        }
        const metrics = {
          xMin: Math.min.apply(null, xCoords),
          yMin: Math.min.apply(null, yCoords),
          xMax: Math.max.apply(null, xCoords),
          yMax: Math.max.apply(null, yCoords),
          leftSideBearing: this.leftSideBearing
        };
        if (!isFinite(metrics.xMin)) {
          metrics.xMin = 0;
        }
        if (!isFinite(metrics.xMax)) {
          metrics.xMax = this.advanceWidth;
        }
        if (!isFinite(metrics.yMin)) {
          metrics.yMin = 0;
        }
        if (!isFinite(metrics.yMax)) {
          metrics.yMax = 0;
        }
        metrics.rightSideBearing = this.advanceWidth - metrics.leftSideBearing - (metrics.xMax - metrics.xMin);
        return metrics;
      };
      Glyph.prototype.draw = function(ctx, x, y, fontSize, options, font) {
        options = Object.assign({}, font && font.defaultRenderOptions, options);
        const path2 = this.getPath(x, y, fontSize, options, font);
        path2.draw(ctx);
      };
      Glyph.prototype.drawPoints = function(ctx, x, y, fontSize, options, font) {
        options = Object.assign({}, font && font.defaultRenderOptions, options);
        if (options.drawLayers) {
          const layers = this.getLayers(font);
          if (layers && layers.length) {
            for (let l = 0; l < layers.length; l += 1) {
              if (layers[l].glyph.index !== this.index) {
                this.drawPoints.call(layers[l].glyph, ctx, x, y, fontSize);
              }
            }
            return;
          }
        }
        function drawCircles(l, x2, y2, scale2) {
          ctx.beginPath();
          for (let j = 0; j < l.length; j += 1) {
            ctx.moveTo(x2 + l[j].x * scale2, y2 + l[j].y * scale2);
            ctx.arc(x2 + l[j].x * scale2, y2 + l[j].y * scale2, 2, 0, Math.PI * 2, false);
          }
          ctx.fill();
        }
        x = x !== void 0 ? x : 0;
        y = y !== void 0 ? y : 0;
        fontSize = fontSize !== void 0 ? fontSize : 24;
        const scale = 1 / this.path.unitsPerEm * fontSize;
        const blueCircles = [];
        const redCircles = [];
        const path2 = this.path;
        let commands = path2.commands;
        if (font && font.variation) {
          commands = font.variation.getTransform(this, options.variation).path.commands;
        }
        for (let i = 0; i < commands.length; i += 1) {
          const cmd = commands[i];
          if (cmd.x !== void 0) {
            blueCircles.push({ x: cmd.x, y: -cmd.y });
          }
          if (cmd.x1 !== void 0) {
            redCircles.push({ x: cmd.x1, y: -cmd.y1 });
          }
          if (cmd.x2 !== void 0) {
            redCircles.push({ x: cmd.x2, y: -cmd.y2 });
          }
        }
        ctx.fillStyle = "blue";
        drawCircles(blueCircles, x, y, scale);
        ctx.fillStyle = "red";
        drawCircles(redCircles, x, y, scale);
      };
      Glyph.prototype.drawMetrics = function(ctx, x, y, fontSize) {
        let scale;
        x = x !== void 0 ? x : 0;
        y = y !== void 0 ? y : 0;
        fontSize = fontSize !== void 0 ? fontSize : 24;
        scale = 1 / this.path.unitsPerEm * fontSize;
        ctx.lineWidth = 1;
        ctx.strokeStyle = "black";
        draw_default.line(ctx, x, -1e4, x, 1e4);
        draw_default.line(ctx, -1e4, y, 1e4, y);
        const xMin = this.xMin || 0;
        let yMin = this.yMin || 0;
        const xMax = this.xMax || 0;
        let yMax = this.yMax || 0;
        const advanceWidth = this.advanceWidth || 0;
        ctx.strokeStyle = "blue";
        draw_default.line(ctx, x + xMin * scale, -1e4, x + xMin * scale, 1e4);
        draw_default.line(ctx, x + xMax * scale, -1e4, x + xMax * scale, 1e4);
        draw_default.line(ctx, -1e4, y + -yMin * scale, 1e4, y + -yMin * scale);
        draw_default.line(ctx, -1e4, y + -yMax * scale, 1e4, y + -yMax * scale);
        ctx.strokeStyle = "green";
        draw_default.line(ctx, x + advanceWidth * scale, -1e4, x + advanceWidth * scale, 1e4);
      };
      Glyph.prototype.toPathData = function(options, font) {
        options = Object.assign({}, { variation: font && font.defaultRenderOptions.variation }, options);
        let useGlyph = this;
        if (font && font.variation) {
          useGlyph = font.variation.getTransform(this, options.variation);
        }
        let usePath = useGlyph.points && options.pointsTransform ? options.pointsTransform(useGlyph.points) : useGlyph.path;
        if (options.pathTransform) {
          usePath = options.pathTransform(usePath);
        }
        return usePath.toPathData(options);
      };
      Glyph.prototype.fromSVG = function(pathData, options = {}) {
        return this.path.fromSVG(pathData, options);
      };
      Glyph.prototype.toSVG = function(options, font) {
        const pathData = this.toPathData.apply(this, [options, font]);
        return this.path.toSVG(options, pathData);
      };
      Glyph.prototype.toDOMElement = function(options, font) {
        options = Object.assign({}, { variation: font && font.defaultRenderOptions.variation }, options);
        let usePath = this.path;
        if (font && font.variation) {
          usePath = font.variation.getTransform(this, options.variation).path;
        }
        return usePath.toDOMElement(options);
      };
      var glyph_default = Glyph;
      function defineDependentProperty(glyph, externalName, internalName) {
        Object.defineProperty(glyph, externalName, {
          get: function() {
            typeof glyph[internalName] === "undefined" && glyph.path;
            return glyph[internalName];
          },
          set: function(newValue) {
            glyph[internalName] = newValue;
          },
          enumerable: true,
          configurable: true
        });
      }
      function GlyphSet(font, glyphs) {
        this.font = font;
        this.glyphs = {};
        if (Array.isArray(glyphs)) {
          for (let i = 0; i < glyphs.length; i++) {
            const glyph = glyphs[i];
            glyph.path.unitsPerEm = font.unitsPerEm;
            this.glyphs[i] = glyph;
          }
        }
        this.length = glyphs && glyphs.length || 0;
      }
      if (typeof Symbol !== "undefined" && Symbol.iterator) {
        GlyphSet.prototype[Symbol.iterator] = function() {
          let n = -1;
          return {
            next: function() {
              n++;
              const done = n >= this.length - 1;
              return { value: this.get(n), done };
            }.bind(this)
          };
        };
      }
      GlyphSet.prototype.get = function(index) {
        if (this.font._push && this.glyphs[index] === void 0) {
          this.font._push(index);
          if (typeof this.glyphs[index] === "function") {
            this.glyphs[index] = this.glyphs[index]();
          }
          let glyph = this.glyphs[index];
          let unicodeObj = this.font._IndexToUnicodeMap[index];
          if (unicodeObj) {
            for (let j = 0; j < unicodeObj.unicodes.length; j++)
              glyph.addUnicode(unicodeObj.unicodes[j]);
          }
          if (this.font.cffEncoding) {
            glyph.name = this.font.cffEncoding.charset[index];
          } else if (this.font.glyphNames.names) {
            glyph.name = this.font.glyphNames.glyphIndexToName(index);
          }
          this.glyphs[index].advanceWidth = this.font._hmtxTableData[index].advanceWidth;
          this.glyphs[index].leftSideBearing = this.font._hmtxTableData[index].leftSideBearing;
        } else {
          if (typeof this.glyphs[index] === "function") {
            this.glyphs[index] = this.glyphs[index]();
          }
        }
        return this.glyphs[index];
      };
      GlyphSet.prototype.push = function(index, loader) {
        this.glyphs[index] = loader;
        this.length++;
      };
      function glyphLoader(font, index) {
        return new glyph_default({ index, font });
      }
      function ttfGlyphLoader(font, index, parseGlyph2, data, position, buildPath2) {
        return function() {
          const glyph = new glyph_default({ index, font });
          glyph.path = function() {
            parseGlyph2(glyph, data, position);
            const path2 = buildPath2(font.glyphs, glyph);
            path2.unitsPerEm = font.unitsPerEm;
            return path2;
          };
          defineDependentProperty(glyph, "numberOfContours", "_numberOfContours");
          defineDependentProperty(glyph, "xMin", "_xMin");
          defineDependentProperty(glyph, "xMax", "_xMax");
          defineDependentProperty(glyph, "yMin", "_yMin");
          defineDependentProperty(glyph, "yMax", "_yMax");
          defineDependentProperty(glyph, "points", "_points");
          return glyph;
        };
      }
      function cffGlyphLoader(font, index, parseCFFCharstring2, charstring, version) {
        return function() {
          const glyph = new glyph_default({ index, font });
          glyph.path = function() {
            const path2 = parseCFFCharstring2(font, glyph, charstring, version);
            path2.unitsPerEm = font.unitsPerEm;
            return path2;
          };
          return glyph;
        };
      }
      var glyphset_default = { GlyphSet, glyphLoader, ttfGlyphLoader, cffGlyphLoader };
      function equals(a, b) {
        if (a === b) {
          return true;
        } else if (Array.isArray(a) && Array.isArray(b)) {
          if (a.length !== b.length) {
            return false;
          }
          for (let i = 0; i < a.length; i += 1) {
            if (!equals(a[i], b[i])) {
              return false;
            }
          }
          return true;
        } else {
          return false;
        }
      }
      var MAX_CALL_DEPTH = 10;
      function calcCFFSubroutineBias(subrs) {
        let bias;
        if (subrs.length < 1240) {
          bias = 107;
        } else if (subrs.length < 33900) {
          bias = 1131;
        } else {
          bias = 32768;
        }
        return bias;
      }
      function parseCFFIndex(data, start, conversionFn, version) {
        const offsets = [];
        const objects = [];
        const count = version > 1 ? parse_default.getULong(data, start) : parse_default.getCard16(data, start);
        const countLength = version > 1 ? 4 : 2;
        let objectOffset;
        let endOffset;
        if (count !== 0) {
          const offsetSize = parse_default.getByte(data, start + countLength);
          objectOffset = start + (count + 1) * offsetSize + countLength;
          let pos = start + countLength + 1;
          for (let i = 0; i < count + 1; i += 1) {
            offsets.push(parse_default.getOffset(data, pos, offsetSize));
            pos += offsetSize;
          }
          endOffset = objectOffset + offsets[count];
        } else {
          endOffset = start + countLength;
        }
        for (let i = 0; i < offsets.length - 1; i += 1) {
          let value = parse_default.getBytes(data, objectOffset + offsets[i], objectOffset + offsets[i + 1]);
          if (conversionFn) {
            value = conversionFn(value, data, start, version);
          }
          objects.push(value);
        }
        return { objects, startOffset: start, endOffset };
      }
      function parseCFFIndexLowMemory(data, start, version) {
        const offsets = [];
        const count = version > 1 ? parse_default.getULong(data, start) : parse_default.getCard16(data, start);
        const countLength = version > 1 ? 4 : 2;
        let objectOffset;
        let endOffset;
        if (count !== 0) {
          const offsetSize = parse_default.getByte(data, start + countLength);
          objectOffset = start + (count + 1) * offsetSize + countLength;
          let pos = start + countLength + 1;
          for (let i = 0; i < count + 1; i += 1) {
            offsets.push(parse_default.getOffset(data, pos, offsetSize));
            pos += offsetSize;
          }
          endOffset = objectOffset + offsets[count];
        } else {
          endOffset = start + countLength;
        }
        return { offsets, startOffset: start, endOffset };
      }
      function getCffIndexObject(i, offsets, data, start, conversionFn, version) {
        const count = version > 1 ? parse_default.getULong(data, start) : parse_default.getCard16(data, start);
        const countLength = version > 1 ? 4 : 2;
        let objectOffset = 0;
        if (count !== 0) {
          const offsetSize = parse_default.getByte(data, start + countLength);
          objectOffset = start + (count + 1) * offsetSize + countLength;
        }
        let value = parse_default.getBytes(data, objectOffset + offsets[i], objectOffset + offsets[i + 1]);
        if (conversionFn) {
          value = conversionFn(value);
        }
        return value;
      }
      function parseFloatOperand(parser) {
        let s = "";
        const eof = 15;
        const lookup = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "E", "E-", null, "-"];
        for (; ; ) {
          const b = parser.parseByte();
          const n1 = b >> 4;
          const n2 = b & 15;
          if (n1 === eof) {
            break;
          }
          s += lookup[n1];
          if (n2 === eof) {
            break;
          }
          s += lookup[n2];
        }
        return parseFloat(s);
      }
      function parseOperand(parser, b0) {
        let b1;
        let b2;
        let b3;
        let b4;
        if (b0 === 28) {
          b1 = parser.parseByte();
          b2 = parser.parseByte();
          return b1 << 8 | b2;
        }
        if (b0 === 29) {
          b1 = parser.parseByte();
          b2 = parser.parseByte();
          b3 = parser.parseByte();
          b4 = parser.parseByte();
          return b1 << 24 | b2 << 16 | b3 << 8 | b4;
        }
        if (b0 === 30) {
          return parseFloatOperand(parser);
        }
        if (b0 >= 32 && b0 <= 246) {
          return b0 - 139;
        }
        if (b0 >= 247 && b0 <= 250) {
          b1 = parser.parseByte();
          return (b0 - 247) * 256 + b1 + 108;
        }
        if (b0 >= 251 && b0 <= 254) {
          b1 = parser.parseByte();
          return -(b0 - 251) * 256 - b1 - 108;
        }
        throw new Error("Invalid b0 " + b0);
      }
      function entriesToObject(entries) {
        const o = {};
        for (let i = 0; i < entries.length; i += 1) {
          const key = entries[i][0];
          const values = entries[i][1];
          let value;
          if (values.length === 1) {
            value = values[0];
          } else {
            value = values;
          }
          if (Object.prototype.hasOwnProperty.call(o, key) && !isNaN(o[key])) {
            throw new Error("Object " + o + " already has key " + key);
          }
          o[key] = value;
        }
        return o;
      }
      function parseCFFDict(data, start, size, version) {
        start = start !== void 0 ? start : 0;
        const parser = new parse_default.Parser(data, start);
        const entries = [];
        let operands = [];
        size = size !== void 0 ? size : data.byteLength;
        let operandsStart = version < 2 ? 22 : 28;
        while (parser.relativeOffset < size) {
          let op = parser.parseByte();
          if (op < operandsStart) {
            if (op === 12) {
              op = 1200 + parser.parseByte();
            }
            if (version > 1 && op === 23) {
              parseBlend(operands);
              continue;
            }
            entries.push([op, operands]);
            operands = [];
          } else {
            operands.push(parseOperand(parser, op, version));
          }
        }
        return entriesToObject(entries);
      }
      function getCFFString(strings, index) {
        if (index <= 390) {
          index = cffStandardStrings[index];
        } else if (strings) {
          index = strings[index - 391];
        } else {
          index = void 0;
        }
        return index;
      }
      function interpretDict(dict, meta, strings) {
        const newDict = {};
        let value;
        for (let i = 0; i < meta.length; i += 1) {
          const m = meta[i];
          if (Array.isArray(m.type)) {
            const values = [];
            values.length = m.type.length;
            for (let j = 0; j < m.type.length; j++) {
              value = dict[m.op] !== void 0 ? dict[m.op][j] : void 0;
              if (value === void 0) {
                value = m.value !== void 0 && m.value[j] !== void 0 ? m.value[j] : null;
              }
              if (m.type[j] === "SID") {
                value = getCFFString(strings, value);
              }
              values[j] = value;
            }
            newDict[m.name] = values;
          } else {
            value = dict[m.op];
            if (value === void 0) {
              value = m.value !== void 0 ? m.value : null;
            }
            if (m.type === "SID") {
              value = getCFFString(strings, value);
            }
            newDict[m.name] = value;
          }
        }
        return newDict;
      }
      function parseCFFHeader(data, start) {
        const header = {};
        header.formatMajor = parse_default.getCard8(data, start);
        header.formatMinor = parse_default.getCard8(data, start + 1);
        if (header.formatMajor > 2) {
          throw new Error(`Unsupported CFF table version ${header.formatMajor}.${header.formatMinor}`);
        }
        header.size = parse_default.getCard8(data, start + 2);
        if (header.formatMajor < 2) {
          header.offsetSize = parse_default.getCard8(data, start + 3);
          header.startOffset = start;
          header.endOffset = start + 4;
        } else {
          header.topDictLength = parse_default.getCard16(data, start + 3);
          header.endOffset = start + 8;
        }
        return header;
      }
      var TOP_DICT_META = [
        { name: "version", op: 0, type: "SID" },
        { name: "notice", op: 1, type: "SID" },
        { name: "copyright", op: 1200, type: "SID" },
        { name: "fullName", op: 2, type: "SID" },
        { name: "familyName", op: 3, type: "SID" },
        { name: "weight", op: 4, type: "SID" },
        { name: "isFixedPitch", op: 1201, type: "number", value: 0 },
        { name: "italicAngle", op: 1202, type: "number", value: 0 },
        { name: "underlinePosition", op: 1203, type: "number", value: -100 },
        { name: "underlineThickness", op: 1204, type: "number", value: 50 },
        { name: "paintType", op: 1205, type: "number", value: 0 },
        { name: "charstringType", op: 1206, type: "number", value: 2 },
        {
          name: "fontMatrix",
          op: 1207,
          type: ["real", "real", "real", "real", "real", "real"],
          value: [1e-3, 0, 0, 1e-3, 0, 0]
        },
        { name: "uniqueId", op: 13, type: "number" },
        { name: "fontBBox", op: 5, type: ["number", "number", "number", "number"], value: [0, 0, 0, 0] },
        { name: "strokeWidth", op: 1208, type: "number", value: 0 },
        { name: "xuid", op: 14, type: [], value: null },
        { name: "charset", op: 15, type: "offset", value: 0 },
        { name: "encoding", op: 16, type: "offset", value: 0 },
        { name: "charStrings", op: 17, type: "offset", value: 0 },
        { name: "private", op: 18, type: ["number", "offset"], value: [0, 0] },
        { name: "ros", op: 1230, type: ["SID", "SID", "number"] },
        { name: "cidFontVersion", op: 1231, type: "number", value: 0 },
        { name: "cidFontRevision", op: 1232, type: "number", value: 0 },
        { name: "cidFontType", op: 1233, type: "number", value: 0 },
        { name: "cidCount", op: 1234, type: "number", value: 8720 },
        { name: "uidBase", op: 1235, type: "number" },
        { name: "fdArray", op: 1236, type: "offset" },
        { name: "fdSelect", op: 1237, type: "offset" },
        { name: "fontName", op: 1238, type: "SID" }
      ];
      var TOP_DICT_META_CFF2 = [
        {
          name: "fontMatrix",
          op: 1207,
          type: ["real", "real", "real", "real", "real", "real"],
          value: [1e-3, 0, 0, 1e-3, 0, 0]
        },
        { name: "charStrings", op: 17, type: "offset" },
        { name: "fdArray", op: 1236, type: "offset" },
        { name: "fdSelect", op: 1237, type: "offset" },
        { name: "vstore", op: 24, type: "offset" }
      ];
      var PRIVATE_DICT_META = [
        { name: "subrs", op: 19, type: "offset", value: 0 },
        { name: "defaultWidthX", op: 20, type: "number", value: 0 },
        { name: "nominalWidthX", op: 21, type: "number", value: 0 }
      ];
      var PRIVATE_DICT_META_CFF2 = [
        { name: "blueValues", op: 6, type: "delta" },
        { name: "otherBlues", op: 7, type: "delta" },
        { name: "familyBlues", op: 7, type: "delta" },
        { name: "familyBlues", op: 8, type: "delta" },
        { name: "familyOtherBlues", op: 9, type: "delta" },
        { name: "blueScale", op: 1209, type: "number", value: 0.039625 },
        { name: "blueShift", op: 1210, type: "number", value: 7 },
        { name: "blueFuzz", op: 1211, type: "number", value: 1 },
        { name: "stdHW", op: 10, type: "number" },
        { name: "stdVW", op: 11, type: "number" },
        { name: "stemSnapH", op: 1212, type: "number" },
        { name: "stemSnapV", op: 1213, type: "number" },
        { name: "languageGroup", op: 1217, type: "number", value: 0 },
        { name: "expansionFactor", op: 1218, type: "number", value: 0.06 },
        { name: "vsindex", op: 22, type: "number", value: 0 },
        { name: "subrs", op: 19, type: "offset" }
      ];
      var FONT_DICT_META = [
        { name: "private", op: 18, type: ["number", "offset"], value: [0, 0] }
      ];
      function parseCFFTopDict(data, start, strings, version) {
        const dict = parseCFFDict(data, start, data.byteLength, version);
        return interpretDict(dict, version > 1 ? TOP_DICT_META_CFF2 : TOP_DICT_META, strings);
      }
      function parseCFFPrivateDict(data, start, size, strings, version) {
        const dict = parseCFFDict(data, start, size, version);
        return interpretDict(dict, version > 1 ? PRIVATE_DICT_META_CFF2 : PRIVATE_DICT_META, strings);
      }
      function parseFontDict(data, start, version) {
        const dict = parseCFFDict(data, start, void 0, version);
        return interpretDict(dict, FONT_DICT_META);
      }
      function gatherCFF2FontDicts(data, start, fdArray) {
        const fontDictArray = [];
        for (let i = 0; i < fdArray.length; i++) {
          const fontDictData = new DataView(new Uint8Array(fdArray[i]).buffer);
          const fontDict = parseFontDict(fontDictData, 0, 2);
          const privateSize = fontDict.private[0];
          const privateOffset = fontDict.private[1];
          if (privateSize !== 0 && privateOffset !== 0) {
            const privateDict = parseCFFPrivateDict(data, privateOffset + start, privateSize, [], 2);
            if (privateDict.subrs) {
              const subrOffset = privateOffset + privateDict.subrs;
              const subrIndex = parseCFFIndex(data, subrOffset + start, void 0, 2);
              fontDict._subrs = subrIndex.objects;
              fontDict._subrsBias = calcCFFSubroutineBias(fontDict._subrs);
            }
            fontDict._privateDict = privateDict;
          }
          fontDictArray.push(fontDict);
        }
        return fontDictArray;
      }
      function gatherCFFTopDicts(data, start, cffIndex, strings, version) {
        const topDictArray = [];
        for (let iTopDict = 0; iTopDict < cffIndex.length; iTopDict += 1) {
          const topDictData = new DataView(new Uint8Array(cffIndex[iTopDict]).buffer);
          const topDict = parseCFFTopDict(topDictData, 0, strings, version);
          topDict._subrs = [];
          topDict._subrsBias = 0;
          topDict._defaultWidthX = 0;
          topDict._nominalWidthX = 0;
          const privateSize = version < 2 ? topDict.private[0] : 0;
          const privateOffset = version < 2 ? topDict.private[1] : 0;
          if (privateSize !== 0 && privateOffset !== 0) {
            const privateDict = parseCFFPrivateDict(data, privateOffset + start, privateSize, strings, version);
            topDict._defaultWidthX = privateDict.defaultWidthX;
            topDict._nominalWidthX = privateDict.nominalWidthX;
            if (privateDict.subrs !== 0) {
              const subrOffset = privateOffset + privateDict.subrs;
              const subrIndex = parseCFFIndex(data, subrOffset + start, void 0, version);
              topDict._subrs = subrIndex.objects;
              topDict._subrsBias = calcCFFSubroutineBias(topDict._subrs);
            }
            topDict._privateDict = privateDict;
          }
          topDictArray.push(topDict);
        }
        return topDictArray;
      }
      function parseCFFCharset(data, start, nGlyphs, strings, isCIDFont) {
        let sid;
        let count;
        const parser = new parse_default.Parser(data, start);
        nGlyphs -= 1;
        const charset = [".notdef"];
        const format = parser.parseCard8();
        if (format === 0) {
          for (let i = 0; i < nGlyphs; i += 1) {
            sid = parser.parseSID();
            if (isCIDFont) {
              charset.push(sid);
            } else {
              charset.push(getCFFString(strings, sid) || sid);
            }
          }
        } else if (format === 1) {
          while (charset.length <= nGlyphs) {
            sid = parser.parseSID();
            count = parser.parseCard8();
            for (let i = 0; i <= count; i += 1) {
              if (isCIDFont) {
                charset.push("cid" + ("00000" + sid).slice(-5));
              } else {
                charset.push(getCFFString(strings, sid) || sid);
              }
              sid += 1;
            }
          }
        } else if (format === 2) {
          while (charset.length <= nGlyphs) {
            sid = parser.parseSID();
            count = parser.parseCard16();
            for (let i = 0; i <= count; i += 1) {
              if (isCIDFont) {
                charset.push("cid" + ("00000" + sid).slice(-5));
              } else {
                charset.push(getCFFString(strings, sid) || sid);
              }
              sid += 1;
            }
          }
        } else {
          throw new Error("Unknown charset format " + format);
        }
        return charset;
      }
      function parseCFFEncoding(data, start) {
        let code;
        const encoding = {};
        const parser = new parse_default.Parser(data, start);
        const format = parser.parseCard8();
        if (format === 0) {
          const nCodes = parser.parseCard8();
          for (let i = 0; i < nCodes; i += 1) {
            code = parser.parseCard8();
            encoding[code] = i;
          }
        } else if (format === 1) {
          const nRanges = parser.parseCard8();
          code = 1;
          for (let i = 0; i < nRanges; i += 1) {
            const first = parser.parseCard8();
            const nLeft = parser.parseCard8();
            for (let j = first; j <= first + nLeft; j += 1) {
              encoding[j] = code;
              code += 1;
            }
          }
        } else {
          throw new Error("Unknown encoding format " + format);
        }
        return encoding;
      }
      function parseBlend(operands) {
        let numberOfBlends = operands.pop();
        while (operands.length > numberOfBlends) {
          operands.pop();
        }
      }
      function applyPaintType(font, path2) {
        const paintType = font.tables.cff && font.tables.cff.topDict && font.tables.cff.topDict.paintType || 0;
        if (paintType === 2) {
          path2.fill = null;
          path2.stroke = "black";
          path2.strokeWidth = font.tables.cff.topDict.strokeWidth || 0;
        }
        return paintType;
      }
      function parseCFFCharstring(font, glyph, code, version, coords) {
        let c1x;
        let c1y;
        let c2x;
        let c2y;
        const p = new path_default();
        const stack = [];
        let nStems = 0;
        let haveWidth = false;
        let open = false;
        let x = 0;
        let y = 0;
        let subrs;
        let subrsBias;
        let defaultWidthX;
        let nominalWidthX;
        let vsindex = 0;
        let vstore = [];
        let blendVector;
        let callDepth = 0;
        const cffTable = font.tables.cff2 || font.tables.cff;
        defaultWidthX = cffTable.topDict._defaultWidthX;
        nominalWidthX = cffTable.topDict._nominalWidthX;
        coords = coords || font.variation && font.variation.get();
        if (!glyph.getBlendPath) {
          glyph.getBlendPath = function(variationCoords) {
            return parseCFFCharstring(font, glyph, code, version, variationCoords);
          };
        }
        if (font.isCIDFont || version > 1) {
          const fdIndex = cffTable.topDict._fdSelect ? cffTable.topDict._fdSelect[glyph.index] : 0;
          const fdDict = cffTable.topDict._fdArray[fdIndex];
          subrs = fdDict._subrs;
          subrsBias = fdDict._subrsBias;
          if (version > 1) {
            vstore = cffTable.topDict._vstore.itemVariationStore;
            vsindex = fdDict._privateDict.vsindex;
          } else {
            defaultWidthX = fdDict._defaultWidthX;
            nominalWidthX = fdDict._nominalWidthX;
          }
        } else {
          subrs = cffTable.topDict._subrs;
          subrsBias = cffTable.topDict._subrsBias;
        }
        const paintType = applyPaintType(font, p);
        let width = defaultWidthX;
        function newContour(x2, y2) {
          if (open && paintType !== 2) {
            p.closePath();
          }
          p.moveTo(x2, y2);
          open = true;
        }
        function parseStems() {
          let hasWidthArg;
          hasWidthArg = (stack.length & 1) !== 0;
          if (hasWidthArg && !haveWidth) {
            width = stack.shift() + nominalWidthX;
          }
          nStems += stack.length >> 1;
          stack.length = 0;
          haveWidth = true;
        }
        function parse(code2) {
          let b1;
          let b2;
          let b3;
          let b4;
          let codeIndex;
          let subrCode;
          let jpx;
          let jpy;
          let c3x;
          let c3y;
          let c4x;
          let c4y;
          let i = 0;
          while (i < code2.length) {
            let v = code2[i];
            i += 1;
            switch (v) {
              case 1:
                parseStems();
                break;
              case 3:
                parseStems();
                break;
              case 4:
                if (stack.length > 1 && !haveWidth) {
                  width = stack.shift() + nominalWidthX;
                  haveWidth = true;
                }
                y += stack.pop();
                newContour(x, y);
                break;
              case 5:
                while (stack.length > 0) {
                  x += stack.shift();
                  y += stack.shift();
                  p.lineTo(x, y);
                }
                break;
              case 6:
                while (stack.length > 0) {
                  x += stack.shift();
                  p.lineTo(x, y);
                  if (stack.length === 0) {
                    break;
                  }
                  y += stack.shift();
                  p.lineTo(x, y);
                }
                break;
              case 7:
                while (stack.length > 0) {
                  y += stack.shift();
                  p.lineTo(x, y);
                  if (stack.length === 0) {
                    break;
                  }
                  x += stack.shift();
                  p.lineTo(x, y);
                }
                break;
              case 8:
                while (stack.length > 0) {
                  c1x = x + stack.shift();
                  c1y = y + stack.shift();
                  c2x = c1x + stack.shift();
                  c2y = c1y + stack.shift();
                  x = c2x + stack.shift();
                  y = c2y + stack.shift();
                  p.curveTo(c1x, c1y, c2x, c2y, x, y);
                }
                break;
              case 10:
                codeIndex = stack.pop() + subrsBias;
                subrCode = subrs[codeIndex];
                if (subrCode) {
                  if (callDepth >= MAX_CALL_DEPTH) {
                    console.warn("CFF charstring subroutine call depth exceeded, skipping callsubr");
                    break;
                  }
                  callDepth++;
                  parse(subrCode);
                  callDepth--;
                }
                break;
              case 11:
                if (version > 1) {
                  console.error("CFF CharString operator return (11) is not supported in CFF2");
                  break;
                }
                return;
              case 12:
                v = code2[i];
                i += 1;
                switch (v) {
                  case 35:
                    c1x = x + stack.shift();
                    c1y = y + stack.shift();
                    c2x = c1x + stack.shift();
                    c2y = c1y + stack.shift();
                    jpx = c2x + stack.shift();
                    jpy = c2y + stack.shift();
                    c3x = jpx + stack.shift();
                    c3y = jpy + stack.shift();
                    c4x = c3x + stack.shift();
                    c4y = c3y + stack.shift();
                    x = c4x + stack.shift();
                    y = c4y + stack.shift();
                    stack.shift();
                    p.curveTo(c1x, c1y, c2x, c2y, jpx, jpy);
                    p.curveTo(c3x, c3y, c4x, c4y, x, y);
                    break;
                  case 34:
                    c1x = x + stack.shift();
                    c1y = y;
                    c2x = c1x + stack.shift();
                    c2y = c1y + stack.shift();
                    jpx = c2x + stack.shift();
                    jpy = c2y;
                    c3x = jpx + stack.shift();
                    c3y = c2y;
                    c4x = c3x + stack.shift();
                    c4y = y;
                    x = c4x + stack.shift();
                    p.curveTo(c1x, c1y, c2x, c2y, jpx, jpy);
                    p.curveTo(c3x, c3y, c4x, c4y, x, y);
                    break;
                  case 36:
                    c1x = x + stack.shift();
                    c1y = y + stack.shift();
                    c2x = c1x + stack.shift();
                    c2y = c1y + stack.shift();
                    jpx = c2x + stack.shift();
                    jpy = c2y;
                    c3x = jpx + stack.shift();
                    c3y = c2y;
                    c4x = c3x + stack.shift();
                    c4y = c3y + stack.shift();
                    x = c4x + stack.shift();
                    p.curveTo(c1x, c1y, c2x, c2y, jpx, jpy);
                    p.curveTo(c3x, c3y, c4x, c4y, x, y);
                    break;
                  case 37:
                    c1x = x + stack.shift();
                    c1y = y + stack.shift();
                    c2x = c1x + stack.shift();
                    c2y = c1y + stack.shift();
                    jpx = c2x + stack.shift();
                    jpy = c2y + stack.shift();
                    c3x = jpx + stack.shift();
                    c3y = jpy + stack.shift();
                    c4x = c3x + stack.shift();
                    c4y = c3y + stack.shift();
                    if (Math.abs(c4x - x) > Math.abs(c4y - y)) {
                      x = c4x + stack.shift();
                    } else {
                      y = c4y + stack.shift();
                    }
                    p.curveTo(c1x, c1y, c2x, c2y, jpx, jpy);
                    p.curveTo(c3x, c3y, c4x, c4y, x, y);
                    break;
                  default:
                    console.log("Glyph " + glyph.index + ": unknown operator 1200" + v);
                    stack.length = 0;
                }
                break;
              case 14:
                if (version > 1) {
                  console.error("CFF CharString operator endchar (14) is not supported in CFF2");
                  break;
                }
                if (stack.length >= 4) {
                  const acharName = cffStandardEncoding[stack.pop()];
                  const bcharName = cffStandardEncoding[stack.pop()];
                  const ady = stack.pop();
                  const adx = stack.pop();
                  if (acharName && bcharName) {
                    glyph.isComposite = true;
                    glyph.components = [];
                    const acharGlyphIndex = font.cffEncoding.charset.indexOf(acharName);
                    const bcharGlyphIndex = font.cffEncoding.charset.indexOf(bcharName);
                    glyph.components.push({
                      glyphIndex: bcharGlyphIndex,
                      dx: 0,
                      dy: 0
                    });
                    glyph.components.push({
                      glyphIndex: acharGlyphIndex,
                      dx: adx,
                      dy: ady
                    });
                    p.extend(font.glyphs.get(bcharGlyphIndex).path);
                    const acharGlyph = font.glyphs.get(acharGlyphIndex);
                    const shiftedCommands = JSON.parse(JSON.stringify(acharGlyph.path.commands));
                    for (let i2 = 0; i2 < shiftedCommands.length; i2 += 1) {
                      const cmd = shiftedCommands[i2];
                      if (cmd.type !== "Z") {
                        cmd.x += adx;
                        cmd.y += ady;
                      }
                      if (cmd.type === "Q" || cmd.type === "C") {
                        cmd.x1 += adx;
                        cmd.y1 += ady;
                      }
                      if (cmd.type === "C") {
                        cmd.x2 += adx;
                        cmd.y2 += ady;
                      }
                    }
                    p.extend(shiftedCommands);
                  }
                } else if (stack.length > 0 && !haveWidth) {
                  width = stack.shift() + nominalWidthX;
                  haveWidth = true;
                }
                if (open && paintType !== 2) {
                  p.closePath();
                  open = false;
                }
                break;
              case 15:
                if (version < 2) {
                  console.error("CFF2 CharString operator vsindex (15) is not supported in CFF");
                  break;
                }
                vsindex = stack.pop();
                break;
              case 16:
                if (version < 2) {
                  console.error("CFF2 CharString operator blend (16) is not supported in CFF");
                  break;
                }
                if (!blendVector) {
                  blendVector = font.variation && coords && font.variation.process.getBlendVector(vstore, vsindex, coords);
                }
                var n = stack.pop();
                var axisCount = blendVector ? blendVector.length : vstore.itemVariationSubtables[vsindex].regionIndexes.length;
                var deltaSetCount = n * axisCount;
                var delta = stack.length - deltaSetCount;
                var deltaSetIndex = delta - n;
                if (blendVector) {
                  for (let i2 = 0; i2 < n; i2++) {
                    var sum = stack[deltaSetIndex + i2];
                    for (let j = 0; j < axisCount; j++) {
                      sum += blendVector[j] * stack[delta++];
                    }
                    stack[deltaSetIndex + i2] = sum;
                  }
                }
                while (deltaSetCount--) {
                  stack.pop();
                }
                break;
              case 18:
                parseStems();
                break;
              case 19:
              // hintmask
              case 20:
                parseStems();
                i += nStems + 7 >> 3;
                break;
              case 21:
                if (stack.length > 2 && !haveWidth) {
                  width = stack.shift() + nominalWidthX;
                  haveWidth = true;
                }
                y += stack.pop();
                x += stack.pop();
                newContour(x, y);
                break;
              case 22:
                if (stack.length > 1 && !haveWidth) {
                  width = stack.shift() + nominalWidthX;
                  haveWidth = true;
                }
                x += stack.pop();
                newContour(x, y);
                break;
              case 23:
                parseStems();
                break;
              case 24:
                while (stack.length > 2) {
                  c1x = x + stack.shift();
                  c1y = y + stack.shift();
                  c2x = c1x + stack.shift();
                  c2y = c1y + stack.shift();
                  x = c2x + stack.shift();
                  y = c2y + stack.shift();
                  p.curveTo(c1x, c1y, c2x, c2y, x, y);
                }
                x += stack.shift();
                y += stack.shift();
                p.lineTo(x, y);
                break;
              case 25:
                while (stack.length > 6) {
                  x += stack.shift();
                  y += stack.shift();
                  p.lineTo(x, y);
                }
                c1x = x + stack.shift();
                c1y = y + stack.shift();
                c2x = c1x + stack.shift();
                c2y = c1y + stack.shift();
                x = c2x + stack.shift();
                y = c2y + stack.shift();
                p.curveTo(c1x, c1y, c2x, c2y, x, y);
                break;
              case 26:
                if (stack.length & 1) {
                  x += stack.shift();
                }
                while (stack.length > 0) {
                  c1x = x;
                  c1y = y + stack.shift();
                  c2x = c1x + stack.shift();
                  c2y = c1y + stack.shift();
                  x = c2x;
                  y = c2y + stack.shift();
                  p.curveTo(c1x, c1y, c2x, c2y, x, y);
                }
                break;
              case 27:
                if (stack.length & 1) {
                  y += stack.shift();
                }
                while (stack.length > 0) {
                  c1x = x + stack.shift();
                  c1y = y;
                  c2x = c1x + stack.shift();
                  c2y = c1y + stack.shift();
                  x = c2x + stack.shift();
                  y = c2y;
                  p.curveTo(c1x, c1y, c2x, c2y, x, y);
                }
                break;
              case 28:
                b1 = code2[i];
                b2 = code2[i + 1];
                stack.push((b1 << 24 | b2 << 16) >> 16);
                i += 2;
                break;
              case 29:
                codeIndex = stack.pop() + font.gsubrsBias;
                subrCode = font.gsubrs[codeIndex];
                if (subrCode) {
                  if (callDepth >= MAX_CALL_DEPTH) {
                    console.warn("CFF charstring subroutine call depth exceeded, skipping callgsubr");
                    break;
                  }
                  callDepth++;
                  parse(subrCode);
                  callDepth--;
                }
                break;
              case 30:
                while (stack.length > 0) {
                  c1x = x;
                  c1y = y + stack.shift();
                  c2x = c1x + stack.shift();
                  c2y = c1y + stack.shift();
                  x = c2x + stack.shift();
                  y = c2y + (stack.length === 1 ? stack.shift() : 0);
                  p.curveTo(c1x, c1y, c2x, c2y, x, y);
                  if (stack.length === 0) {
                    break;
                  }
                  c1x = x + stack.shift();
                  c1y = y;
                  c2x = c1x + stack.shift();
                  c2y = c1y + stack.shift();
                  y = c2y + stack.shift();
                  x = c2x + (stack.length === 1 ? stack.shift() : 0);
                  p.curveTo(c1x, c1y, c2x, c2y, x, y);
                }
                break;
              case 31:
                while (stack.length > 0) {
                  c1x = x + stack.shift();
                  c1y = y;
                  c2x = c1x + stack.shift();
                  c2y = c1y + stack.shift();
                  y = c2y + stack.shift();
                  x = c2x + (stack.length === 1 ? stack.shift() : 0);
                  p.curveTo(c1x, c1y, c2x, c2y, x, y);
                  if (stack.length === 0) {
                    break;
                  }
                  c1x = x;
                  c1y = y + stack.shift();
                  c2x = c1x + stack.shift();
                  c2y = c1y + stack.shift();
                  x = c2x + stack.shift();
                  y = c2y + (stack.length === 1 ? stack.shift() : 0);
                  p.curveTo(c1x, c1y, c2x, c2y, x, y);
                }
                break;
              default:
                if (v < 32) {
                  console.log("Glyph " + glyph.index + ": unknown operator " + v);
                } else if (v < 247) {
                  stack.push(v - 139);
                } else if (v < 251) {
                  b1 = code2[i];
                  i += 1;
                  stack.push((v - 247) * 256 + b1 + 108);
                } else if (v < 255) {
                  b1 = code2[i];
                  i += 1;
                  stack.push(-(v - 251) * 256 - b1 - 108);
                } else {
                  b1 = code2[i];
                  b2 = code2[i + 1];
                  b3 = code2[i + 2];
                  b4 = code2[i + 3];
                  i += 4;
                  stack.push((b1 << 24 | b2 << 16 | b3 << 8 | b4) / 65536);
                }
            }
          }
        }
        parse(code);
        if (font.variation && coords) {
          p.commands = p.commands.map((c) => {
            const keys = Object.keys(c);
            for (let i = 0; i < keys.length; i++) {
              const key = keys[i];
              if (key === "type") continue;
              c[key] = Math.round(c[key]);
            }
            return c;
          });
        }
        if (haveWidth) {
          glyph.advanceWidth = width;
        }
        return p;
      }
      function parseCFFFDSelect(data, start, nGlyphs, fdArrayCount, version) {
        const fdSelect = [];
        let fdIndex;
        const parser = new parse_default.Parser(data, start);
        const format = parser.parseCard8();
        if (format === 0) {
          for (let iGid = 0; iGid < nGlyphs; iGid++) {
            fdIndex = parser.parseCard8();
            if (fdIndex >= fdArrayCount) {
              throw new Error("CFF table CID Font FDSelect has bad FD index value " + fdIndex + " (FD count " + fdArrayCount + ")");
            }
            fdSelect.push(fdIndex);
          }
        } else if (format === 3 || version > 1 && format === 4) {
          const nRanges = format === 4 ? parser.parseULong() : parser.parseCard16();
          let first = format === 4 ? parser.parseULong() : parser.parseCard16();
          if (first !== 0) {
            throw new Error(`CFF Table CID Font FDSelect format ${format} range has bad initial GID ${first}`);
          }
          let next;
          for (let iRange = 0; iRange < nRanges; iRange++) {
            fdIndex = format === 4 ? parser.parseUShort() : parser.parseCard8();
            next = format === 4 ? parser.parseULong() : parser.parseCard16();
            if (fdIndex >= fdArrayCount) {
              throw new Error("CFF table CID Font FDSelect has bad FD index value " + fdIndex + " (FD count " + fdArrayCount + ")");
            }
            if (next > nGlyphs) {
              throw new Error(`CFF Table CID Font FDSelect format ${version} range has bad GID ${next}`);
            }
            for (; first < next; first++) {
              fdSelect.push(fdIndex);
            }
            first = next;
          }
          if (next !== nGlyphs) {
            throw new Error("CFF Table CID Font FDSelect format 3 range has bad final (Sentinal) GID " + next);
          }
        } else {
          throw new Error("CFF Table CID Font FDSelect table has unsupported format " + format);
        }
        return fdSelect;
      }
      function parseCFFTable(data, start, font, opt) {
        let resultTable;
        const header = parseCFFHeader(data, start);
        if (header.formatMajor === 2) {
          resultTable = font.tables.cff2 = {};
        } else {
          resultTable = font.tables.cff = {};
        }
        const nameIndex = header.formatMajor > 1 ? null : parseCFFIndex(data, header.endOffset, parse_default.bytesToString);
        const topDictIndex = header.formatMajor > 1 ? null : parseCFFIndex(data, nameIndex.endOffset);
        const stringIndex = header.formatMajor > 1 ? null : parseCFFIndex(data, topDictIndex.endOffset, parse_default.bytesToString);
        const globalSubrIndex = parseCFFIndex(data, header.formatMajor > 1 ? start + header.size + header.topDictLength : stringIndex.endOffset, void 0, header.formatMajor);
        font.gsubrs = globalSubrIndex.objects;
        font.gsubrsBias = calcCFFSubroutineBias(font.gsubrs);
        let topDict;
        if (header.formatMajor > 1) {
          const topDictOffset = start + header.size;
          const topDictData = parse_default.getBytes(data, topDictOffset, topDictOffset + header.topDictLength);
          topDict = gatherCFFTopDicts(data, 0, [topDictData], void 0, header.formatMajor)[0];
        } else {
          const topDictArray = gatherCFFTopDicts(data, start, topDictIndex.objects, stringIndex.objects, header.formatMajor);
          if (topDictArray.length !== 1) {
            throw new Error("CFF table has too many fonts in 'FontSet' - count of fonts NameIndex.length = " + topDictArray.length);
          }
          topDict = topDictArray[0];
        }
        resultTable.topDict = topDict;
        if (topDict._privateDict) {
          font.defaultWidthX = topDict._privateDict.defaultWidthX;
          font.nominalWidthX = topDict._privateDict.nominalWidthX;
        }
        if (header.formatMajor < 2 && topDict.ros[0] !== void 0 && topDict.ros[1] !== void 0) {
          font.isCIDFont = true;
        }
        if (header.formatMajor > 1) {
          let fdArrayIndexOffset = topDict.fdArray;
          let fdSelectOffset = topDict.fdSelect;
          if (!fdArrayIndexOffset) {
            throw new Error("This is a CFF2 font, but FDArray information is missing");
          }
          const fdArrayIndex = parseCFFIndex(data, start + fdArrayIndexOffset, null, header.formatMajor);
          const fdArray = gatherCFF2FontDicts(data, start, fdArrayIndex.objects);
          topDict._fdArray = fdArray;
          if (fdSelectOffset) {
            topDict._fdSelect = parseCFFFDSelect(data, start + fdSelectOffset, font.numGlyphs, fdArray.length, header.formatMajor);
          }
        } else if (font.isCIDFont) {
          let fdArrayOffset = topDict.fdArray;
          let fdSelectOffset = topDict.fdSelect;
          if (fdArrayOffset === 0 || fdSelectOffset === 0) {
            throw new Error("Font is marked as a CID font, but FDArray and/or FDSelect information is missing");
          }
          fdArrayOffset += start;
          const fdArrayIndex = parseCFFIndex(data, fdArrayOffset);
          const fdArray = gatherCFFTopDicts(data, start, fdArrayIndex.objects, stringIndex.objects, header.formatMajor);
          topDict._fdArray = fdArray;
          fdSelectOffset += start;
          topDict._fdSelect = parseCFFFDSelect(data, fdSelectOffset, font.numGlyphs, fdArray.length, header.formatMajor);
        }
        if (header.formatMajor < 2) {
          const privateDictOffset = start + topDict.private[1];
          const privateDict = parseCFFPrivateDict(data, privateDictOffset, topDict.private[0], stringIndex.objects, header.formatMajor);
          font.defaultWidthX = privateDict.defaultWidthX;
          font.nominalWidthX = privateDict.nominalWidthX;
          if (privateDict.subrs !== 0) {
            const subrOffset = privateDictOffset + privateDict.subrs;
            const subrIndex = parseCFFIndex(data, subrOffset);
            font.subrs = subrIndex.objects;
            font.subrsBias = calcCFFSubroutineBias(font.subrs);
          } else {
            font.subrs = [];
            font.subrsBias = 0;
          }
        }
        let charStringsIndex;
        if (opt.lowMemory) {
          charStringsIndex = parseCFFIndexLowMemory(data, start + topDict.charStrings, header.formatMajor);
          font.nGlyphs = charStringsIndex.offsets.length - (header.formatMajor > 1 ? 1 : 0);
        } else {
          charStringsIndex = parseCFFIndex(data, start + topDict.charStrings, null, header.formatMajor);
          font.nGlyphs = charStringsIndex.objects.length;
        }
        if (header.formatMajor > 1 && font.tables.maxp && font.nGlyphs !== font.tables.maxp.numGlyphs) {
          console.error(`Glyph count in the CFF2 table (${font.nGlyphs}) must correspond to the glyph count in the maxp table (${font.tables.maxp.numGlyphs})`);
        }
        if (header.formatMajor < 2) {
          let charset = [];
          let encoding = [];
          if (topDict.charset === 0) {
            charset = cffISOAdobeStrings;
          } else if (topDict.charset === 1) {
            charset = cffIExpertStrings;
          } else if (topDict.charset === 2) {
            charset = cffExpertSubsetStrings;
          } else {
            charset = parseCFFCharset(data, start + topDict.charset, font.nGlyphs, stringIndex.objects, font.isCIDFont);
          }
          if (topDict.encoding === 0) {
            encoding = cffStandardEncoding;
          } else if (topDict.encoding === 1) {
            encoding = cffExpertEncoding;
          } else {
            encoding = parseCFFEncoding(data, start + topDict.encoding);
          }
          font.cffEncoding = new CffEncoding(encoding, charset);
          font.encoding = font.encoding || font.cffEncoding;
        }
        font.glyphs = new glyphset_default.GlyphSet(font);
        if (opt.lowMemory) {
          font._push = function(i) {
            const charString = getCffIndexObject(i, charStringsIndex.offsets, data, start + topDict.charStrings, void 0, header.formatMajor);
            font.glyphs.push(i, glyphset_default.cffGlyphLoader(font, i, parseCFFCharstring, charString, header.formatMajor));
          };
        } else {
          for (let i = 0; i < font.nGlyphs; i += 1) {
            const charString = charStringsIndex.objects[i];
            font.glyphs.push(i, glyphset_default.cffGlyphLoader(font, i, parseCFFCharstring, charString, header.formatMajor));
          }
        }
        if (topDict.vstore) {
          const p = new parse_default.Parser(data, start + topDict.vstore);
          topDict._vstore = p.parseVariationStore();
        }
      }
      function encodeString(s, strings) {
        let sid;
        let i = cffStandardStrings.indexOf(s);
        if (i >= 0) {
          sid = i;
        }
        i = strings.indexOf(s);
        if (i >= 0) {
          sid = i + cffStandardStrings.length;
        } else {
          sid = cffStandardStrings.length + strings.length;
          strings.push(s);
        }
        return sid;
      }
      function makeHeader() {
        return new table_default.Record("Header", [
          { name: "major", type: "Card8", value: 1 },
          { name: "minor", type: "Card8", value: 0 },
          { name: "hdrSize", type: "Card8", value: 4 },
          { name: "major", type: "Card8", value: 1 }
        ]);
      }
      function makeNameIndex(fontNames) {
        const t = new table_default.Record("Name INDEX", [
          { name: "names", type: "INDEX", value: [] }
        ]);
        t.names = [];
        for (let i = 0; i < fontNames.length; i += 1) {
          t.names.push({ name: "name_" + i, type: "NAME", value: fontNames[i] });
        }
        return t;
      }
      function makeDict(meta, attrs, strings) {
        const m = {};
        for (let i = 0; i < meta.length; i += 1) {
          const entry = meta[i];
          let value = attrs[entry.name];
          if (value !== void 0 && !equals(value, entry.value)) {
            if (entry.type === "SID") {
              value = encodeString(value, strings);
            }
            m[entry.op] = { name: entry.name, type: entry.type, value };
          }
        }
        return m;
      }
      function makeTopDict(attrs, strings, version) {
        const t = new table_default.Record("Top DICT", [
          { name: "dict", type: "DICT", value: {} }
        ]);
        t.dict = makeDict(version > 1 ? TOP_DICT_META_CFF2 : TOP_DICT_META, attrs, strings);
        return t;
      }
      function makeTopDictIndex(topDict) {
        const t = new table_default.Record("Top DICT INDEX", [
          { name: "topDicts", type: "INDEX", value: [] }
        ]);
        t.topDicts = [{ name: "topDict_0", type: "TABLE", value: topDict }];
        return t;
      }
      function makeStringIndex(strings) {
        const t = new table_default.Record("String INDEX", [
          { name: "strings", type: "INDEX", value: [] }
        ]);
        t.strings = [];
        for (let i = 0; i < strings.length; i += 1) {
          t.strings.push({ name: "string_" + i, type: "STRING", value: strings[i] });
        }
        return t;
      }
      function makeGlobalSubrIndex() {
        return new table_default.Record("Global Subr INDEX", [
          { name: "subrs", type: "INDEX", value: [] }
        ]);
      }
      function makeCharsets(glyphNames, strings) {
        const t = new table_default.Record("Charsets", [
          { name: "format", type: "Card8", value: 0 }
        ]);
        for (let i = 0; i < glyphNames.length; i += 1) {
          const glyphName = glyphNames[i];
          const glyphSID = encodeString(glyphName, strings);
          t.fields.push({ name: "glyph_" + i, type: "SID", value: glyphSID });
        }
        return t;
      }
      function glyphToOps(glyph, version) {
        const ops = [];
        const path2 = glyph.path;
        if (version < 2) {
          ops.push({ name: "width", type: "NUMBER", value: glyph.advanceWidth });
        }
        let x = 0;
        let y = 0;
        for (let i = 0; i < path2.commands.length; i += 1) {
          let dx;
          let dy;
          let cmd = path2.commands[i];
          if (cmd.type === "Q") {
            const _13 = 1 / 3;
            const _23 = 2 / 3;
            cmd = {
              type: "C",
              x: cmd.x,
              y: cmd.y,
              x1: Math.round(_13 * x + _23 * cmd.x1),
              y1: Math.round(_13 * y + _23 * cmd.y1),
              x2: Math.round(_13 * cmd.x + _23 * cmd.x1),
              y2: Math.round(_13 * cmd.y + _23 * cmd.y1)
            };
          }
          if (cmd.type === "M") {
            dx = Math.round(cmd.x - x);
            dy = Math.round(cmd.y - y);
            ops.push({ name: "dx", type: "NUMBER", value: dx });
            ops.push({ name: "dy", type: "NUMBER", value: dy });
            ops.push({ name: "rmoveto", type: "OP", value: 21 });
            x = Math.round(cmd.x);
            y = Math.round(cmd.y);
          } else if (cmd.type === "L") {
            dx = Math.round(cmd.x - x);
            dy = Math.round(cmd.y - y);
            ops.push({ name: "dx", type: "NUMBER", value: dx });
            ops.push({ name: "dy", type: "NUMBER", value: dy });
            ops.push({ name: "rlineto", type: "OP", value: 5 });
            x = Math.round(cmd.x);
            y = Math.round(cmd.y);
          } else if (cmd.type === "C") {
            const dx1 = Math.round(cmd.x1 - x);
            const dy1 = Math.round(cmd.y1 - y);
            const dx2 = Math.round(cmd.x2 - cmd.x1);
            const dy2 = Math.round(cmd.y2 - cmd.y1);
            dx = Math.round(cmd.x - cmd.x2);
            dy = Math.round(cmd.y - cmd.y2);
            ops.push({ name: "dx1", type: "NUMBER", value: dx1 });
            ops.push({ name: "dy1", type: "NUMBER", value: dy1 });
            ops.push({ name: "dx2", type: "NUMBER", value: dx2 });
            ops.push({ name: "dy2", type: "NUMBER", value: dy2 });
            ops.push({ name: "dx", type: "NUMBER", value: dx });
            ops.push({ name: "dy", type: "NUMBER", value: dy });
            ops.push({ name: "rrcurveto", type: "OP", value: 8 });
            x = Math.round(cmd.x);
            y = Math.round(cmd.y);
          }
        }
        if (version < 2) {
          ops.push({ name: "endchar", type: "OP", value: 14 });
        }
        return ops;
      }
      function makeCharStringsIndex(glyphs, version) {
        const t = new table_default.Record("CharStrings INDEX", [
          { name: "charStrings", type: "INDEX", value: [] }
        ]);
        for (let i = 0; i < glyphs.length; i += 1) {
          const glyph = glyphs.get(i);
          const ops = glyphToOps(glyph, version);
          t.charStrings.push({ name: glyph.name, type: "CHARSTRING", value: ops });
        }
        return t;
      }
      function makePrivateDict(attrs, strings, version) {
        const t = new table_default.Record("Private DICT", [
          { name: "dict", type: "DICT", value: {} }
        ]);
        t.dict = makeDict(version > 1 ? PRIVATE_DICT_META_CFF2 : PRIVATE_DICT_META, attrs, strings);
        return t;
      }
      function makeCFFTable(glyphs, options) {
        const cffVersion = 1;
        const t = new table_default.Table("CFF ", [
          { name: "header", type: "RECORD" },
          { name: "nameIndex", type: "RECORD" },
          { name: "topDictIndex", type: "RECORD" },
          { name: "stringIndex", type: "RECORD" },
          { name: "globalSubrIndex", type: "RECORD" },
          { name: "charsets", type: "RECORD" },
          { name: "charStringsIndex", type: "RECORD" },
          { name: "privateDict", type: "RECORD" }
        ]);
        const fontScale = 1 / options.unitsPerEm;
        const attrs = {
          version: options.version,
          fullName: options.fullName,
          familyName: options.familyName,
          weight: options.weightName,
          fontBBox: options.fontBBox || [0, 0, 0, 0],
          fontMatrix: [fontScale, 0, 0, fontScale, 0, 0],
          charset: 999,
          encoding: 0,
          charStrings: 999,
          private: [0, 999]
        };
        const topDictOptions = options && options.topDict || {};
        if (cffVersion < 2 && topDictOptions.paintType) {
          attrs.paintType = topDictOptions.paintType;
          attrs.strokeWidth = topDictOptions.strokeWidth || 0;
        }
        const privateAttrs = {};
        const glyphNames = [];
        let glyph;
        for (let i = 1; i < glyphs.length; i += 1) {
          glyph = glyphs.get(i);
          glyphNames.push(glyph.name);
        }
        const strings = [];
        t.header = makeHeader();
        t.nameIndex = makeNameIndex([options.postScriptName]);
        let topDict = makeTopDict(attrs, strings);
        t.topDictIndex = makeTopDictIndex(topDict);
        t.globalSubrIndex = makeGlobalSubrIndex();
        t.charsets = makeCharsets(glyphNames, strings);
        t.charStringsIndex = makeCharStringsIndex(glyphs, cffVersion);
        t.privateDict = makePrivateDict(privateAttrs, strings);
        t.stringIndex = makeStringIndex(strings);
        const startOffset = t.header.sizeOf() + t.nameIndex.sizeOf() + t.topDictIndex.sizeOf() + t.stringIndex.sizeOf() + t.globalSubrIndex.sizeOf();
        attrs.charset = startOffset;
        attrs.encoding = 0;
        attrs.charStrings = attrs.charset + t.charsets.sizeOf();
        attrs.private[1] = attrs.charStrings + t.charStringsIndex.sizeOf();
        topDict = makeTopDict(attrs, strings);
        t.topDictIndex = makeTopDictIndex(topDict);
        return t;
      }
      var cff_default = { parse: parseCFFTable, make: makeCFFTable };
      function parseHeadTable(data, start) {
        const head = {};
        const p = new parse_default.Parser(data, start);
        head.version = p.parseVersion();
        head.fontRevision = Math.round(p.parseFixed() * 1e3) / 1e3;
        head.checkSumAdjustment = p.parseULong();
        head.magicNumber = p.parseULong();
        check_default.argument(head.magicNumber === 1594834165, "Font header has wrong magic number.");
        head.flags = p.parseUShort();
        head.unitsPerEm = p.parseUShort();
        head.created = p.parseLongDateTime();
        head.modified = p.parseLongDateTime();
        head.xMin = p.parseShort();
        head.yMin = p.parseShort();
        head.xMax = p.parseShort();
        head.yMax = p.parseShort();
        head.macStyle = p.parseUShort();
        head.lowestRecPPEM = p.parseUShort();
        head.fontDirectionHint = p.parseShort();
        head.indexToLocFormat = p.parseShort();
        head.glyphDataFormat = p.parseShort();
        return head;
      }
      function makeHeadTable(options) {
        const timestamp = Math.round((/* @__PURE__ */ new Date()).getTime() / 1e3) + 2082844800;
        let createdTimestamp = timestamp;
        let macStyle = options.macStyle || 0;
        if (options.createdTimestamp) {
          createdTimestamp = options.createdTimestamp + 2082844800;
        }
        return new table_default.Table("head", [
          { name: "version", type: "FIXED", value: 65536 },
          { name: "fontRevision", type: "FIXED", value: 65536 },
          { name: "checkSumAdjustment", type: "ULONG", value: 0 },
          { name: "magicNumber", type: "ULONG", value: 1594834165 },
          { name: "flags", type: "USHORT", value: 0 },
          { name: "unitsPerEm", type: "USHORT", value: 1e3 },
          { name: "created", type: "LONGDATETIME", value: createdTimestamp },
          { name: "modified", type: "LONGDATETIME", value: timestamp },
          { name: "xMin", type: "SHORT", value: 0 },
          { name: "yMin", type: "SHORT", value: 0 },
          { name: "xMax", type: "SHORT", value: 0 },
          { name: "yMax", type: "SHORT", value: 0 },
          { name: "macStyle", type: "USHORT", value: macStyle },
          { name: "lowestRecPPEM", type: "USHORT", value: 0 },
          { name: "fontDirectionHint", type: "SHORT", value: 2 },
          { name: "indexToLocFormat", type: "SHORT", value: 0 },
          { name: "glyphDataFormat", type: "SHORT", value: 0 }
        ], options);
      }
      var head_default = { parse: parseHeadTable, make: makeHeadTable };
      function parseHheaTable(data, start) {
        const hhea = {};
        const p = new parse_default.Parser(data, start);
        hhea.version = p.parseVersion();
        hhea.ascender = p.parseShort();
        hhea.descender = p.parseShort();
        hhea.lineGap = p.parseShort();
        hhea.advanceWidthMax = p.parseUShort();
        hhea.minLeftSideBearing = p.parseShort();
        hhea.minRightSideBearing = p.parseShort();
        hhea.xMaxExtent = p.parseShort();
        hhea.caretSlopeRise = p.parseShort();
        hhea.caretSlopeRun = p.parseShort();
        hhea.caretOffset = p.parseShort();
        p.relativeOffset += 8;
        hhea.metricDataFormat = p.parseShort();
        hhea.numberOfHMetrics = p.parseUShort();
        return hhea;
      }
      function makeHheaTable(options) {
        return new table_default.Table("hhea", [
          { name: "version", type: "FIXED", value: 65536 },
          { name: "ascender", type: "FWORD", value: 0 },
          { name: "descender", type: "FWORD", value: 0 },
          { name: "lineGap", type: "FWORD", value: 0 },
          { name: "advanceWidthMax", type: "UFWORD", value: 0 },
          { name: "minLeftSideBearing", type: "FWORD", value: 0 },
          { name: "minRightSideBearing", type: "FWORD", value: 0 },
          { name: "xMaxExtent", type: "FWORD", value: 0 },
          { name: "caretSlopeRise", type: "SHORT", value: 1 },
          { name: "caretSlopeRun", type: "SHORT", value: 0 },
          { name: "caretOffset", type: "SHORT", value: 0 },
          { name: "reserved1", type: "SHORT", value: 0 },
          { name: "reserved2", type: "SHORT", value: 0 },
          { name: "reserved3", type: "SHORT", value: 0 },
          { name: "reserved4", type: "SHORT", value: 0 },
          { name: "metricDataFormat", type: "SHORT", value: 0 },
          { name: "numberOfHMetrics", type: "USHORT", value: 0 }
        ], options);
      }
      var hhea_default = { parse: parseHheaTable, make: makeHheaTable };
      function parseHmtxTableAll(data, start, numMetrics, numGlyphs, glyphs) {
        let advanceWidth;
        let leftSideBearing;
        const p = new parse_default.Parser(data, start);
        for (let i = 0; i < numGlyphs; i += 1) {
          if (i < numMetrics) {
            advanceWidth = p.parseUShort();
            leftSideBearing = p.parseShort();
          }
          const glyph = glyphs.get(i);
          glyph.advanceWidth = advanceWidth;
          glyph.leftSideBearing = leftSideBearing;
        }
      }
      function parseHmtxTableOnLowMemory(font, data, start, numMetrics, numGlyphs) {
        font._hmtxTableData = {};
        let advanceWidth;
        let leftSideBearing;
        const p = new parse_default.Parser(data, start);
        for (let i = 0; i < numGlyphs; i += 1) {
          if (i < numMetrics) {
            advanceWidth = p.parseUShort();
            leftSideBearing = p.parseShort();
          }
          font._hmtxTableData[i] = {
            advanceWidth,
            leftSideBearing
          };
        }
      }
      function parseHmtxTable(font, data, start, numMetrics, numGlyphs, glyphs, opt) {
        if (opt.lowMemory)
          parseHmtxTableOnLowMemory(font, data, start, numMetrics, numGlyphs);
        else
          parseHmtxTableAll(data, start, numMetrics, numGlyphs, glyphs);
      }
      function makeHmtxTable(glyphs) {
        const t = new table_default.Table("hmtx", []);
        for (let i = 0; i < glyphs.length; i += 1) {
          const glyph = glyphs.get(i);
          const advanceWidth = glyph.advanceWidth || 0;
          const leftSideBearing = glyph.leftSideBearing || 0;
          t.fields.push({ name: "advanceWidth_" + i, type: "USHORT", value: advanceWidth });
          t.fields.push({ name: "leftSideBearing_" + i, type: "SHORT", value: leftSideBearing });
        }
        return t;
      }
      var hmtx_default = { parse: parseHmtxTable, make: makeHmtxTable };
      function makeLtagTable(tags) {
        const result = new table_default.Table("ltag", [
          { name: "version", type: "ULONG", value: 1 },
          { name: "flags", type: "ULONG", value: 0 },
          { name: "numTags", type: "ULONG", value: tags.length }
        ]);
        let stringPool = "";
        const stringPoolOffset = 12 + tags.length * 4;
        for (let i = 0; i < tags.length; ++i) {
          let pos = stringPool.indexOf(tags[i]);
          if (pos < 0) {
            pos = stringPool.length;
            stringPool += tags[i];
          }
          result.fields.push({ name: "offset " + i, type: "USHORT", value: stringPoolOffset + pos });
          result.fields.push({ name: "length " + i, type: "USHORT", value: tags[i].length });
        }
        result.fields.push({ name: "stringPool", type: "CHARARRAY", value: stringPool });
        return result;
      }
      function parseLtagTable(data, start) {
        const p = new parse_default.Parser(data, start);
        const tableVersion = p.parseULong();
        check_default.argument(tableVersion === 1, "Unsupported ltag table version.");
        p.skip("uLong", 1);
        const numTags = p.parseULong();
        const tags = [];
        for (let i = 0; i < numTags; i++) {
          let tag = "";
          const offset = start + p.parseUShort();
          const length = p.parseUShort();
          for (let j = offset; j < offset + length; ++j) {
            tag += String.fromCharCode(data.getInt8(j));
          }
          tags.push(tag);
        }
        return tags;
      }
      var ltag_default = { make: makeLtagTable, parse: parseLtagTable };
      function parseMaxpTable(data, start) {
        const maxp = {};
        const p = new parse_default.Parser(data, start);
        maxp.version = p.parseVersion();
        maxp.numGlyphs = p.parseUShort();
        if (maxp.version === 1) {
          maxp.maxPoints = p.parseUShort();
          maxp.maxContours = p.parseUShort();
          maxp.maxCompositePoints = p.parseUShort();
          maxp.maxCompositeContours = p.parseUShort();
          maxp.maxZones = p.parseUShort();
          maxp.maxTwilightPoints = p.parseUShort();
          maxp.maxStorage = p.parseUShort();
          maxp.maxFunctionDefs = p.parseUShort();
          maxp.maxInstructionDefs = p.parseUShort();
          maxp.maxStackElements = p.parseUShort();
          maxp.maxSizeOfInstructions = p.parseUShort();
          maxp.maxComponentElements = p.parseUShort();
          maxp.maxComponentDepth = p.parseUShort();
        }
        return maxp;
      }
      function makeMaxpTable(numGlyphs) {
        return new table_default.Table("maxp", [
          { name: "version", type: "FIXED", value: 20480 },
          { name: "numGlyphs", type: "USHORT", value: numGlyphs }
        ]);
      }
      var maxp_default = { parse: parseMaxpTable, make: makeMaxpTable };
      var unicodeRanges = [
        { begin: 0, end: 127 },
        // Basic Latin
        { begin: 128, end: 255 },
        // Latin-1 Supplement
        { begin: 256, end: 383 },
        // Latin Extended-A
        { begin: 384, end: 591 },
        // Latin Extended-B
        { begin: 592, end: 687 },
        // IPA Extensions
        { begin: 688, end: 767 },
        // Spacing Modifier Letters
        { begin: 768, end: 879 },
        // Combining Diacritical Marks
        { begin: 880, end: 1023 },
        // Greek and Coptic
        { begin: 11392, end: 11519 },
        // Coptic
        { begin: 1024, end: 1279 },
        // Cyrillic
        { begin: 1328, end: 1423 },
        // Armenian
        { begin: 1424, end: 1535 },
        // Hebrew
        { begin: 42240, end: 42559 },
        // Vai
        { begin: 1536, end: 1791 },
        // Arabic
        { begin: 1984, end: 2047 },
        // NKo
        { begin: 2304, end: 2431 },
        // Devanagari
        { begin: 2432, end: 2559 },
        // Bengali
        { begin: 2560, end: 2687 },
        // Gurmukhi
        { begin: 2688, end: 2815 },
        // Gujarati
        { begin: 2816, end: 2943 },
        // Oriya
        { begin: 2944, end: 3071 },
        // Tamil
        { begin: 3072, end: 3199 },
        // Telugu
        { begin: 3200, end: 3327 },
        // Kannada
        { begin: 3328, end: 3455 },
        // Malayalam
        { begin: 3584, end: 3711 },
        // Thai
        { begin: 3712, end: 3839 },
        // Lao
        { begin: 4256, end: 4351 },
        // Georgian
        { begin: 6912, end: 7039 },
        // Balinese
        { begin: 4352, end: 4607 },
        // Hangul Jamo
        { begin: 7680, end: 7935 },
        // Latin Extended Additional
        { begin: 7936, end: 8191 },
        // Greek Extended
        { begin: 8192, end: 8303 },
        // General Punctuation
        { begin: 8304, end: 8351 },
        // Superscripts And Subscripts
        { begin: 8352, end: 8399 },
        // Currency Symbol
        { begin: 8400, end: 8447 },
        // Combining Diacritical Marks For Symbols
        { begin: 8448, end: 8527 },
        // Letterlike Symbols
        { begin: 8528, end: 8591 },
        // Number Forms
        { begin: 8592, end: 8703 },
        // Arrows
        { begin: 8704, end: 8959 },
        // Mathematical Operators
        { begin: 8960, end: 9215 },
        // Miscellaneous Technical
        { begin: 9216, end: 9279 },
        // Control Pictures
        { begin: 9280, end: 9311 },
        // Optical Character Recognition
        { begin: 9312, end: 9471 },
        // Enclosed Alphanumerics
        { begin: 9472, end: 9599 },
        // Box Drawing
        { begin: 9600, end: 9631 },
        // Block Elements
        { begin: 9632, end: 9727 },
        // Geometric Shapes
        { begin: 9728, end: 9983 },
        // Miscellaneous Symbols
        { begin: 9984, end: 10175 },
        // Dingbats
        { begin: 12288, end: 12351 },
        // CJK Symbols And Punctuation
        { begin: 12352, end: 12447 },
        // Hiragana
        { begin: 12448, end: 12543 },
        // Katakana
        { begin: 12544, end: 12591 },
        // Bopomofo
        { begin: 12592, end: 12687 },
        // Hangul Compatibility Jamo
        { begin: 43072, end: 43135 },
        // Phags-pa
        { begin: 12800, end: 13055 },
        // Enclosed CJK Letters And Months
        { begin: 13056, end: 13311 },
        // CJK Compatibility
        { begin: 44032, end: 55215 },
        // Hangul Syllables
        { begin: 55296, end: 57343 },
        // Non-Plane 0 *
        { begin: 67840, end: 67871 },
        // Phoenicia
        { begin: 19968, end: 40959 },
        // CJK Unified Ideographs
        { begin: 57344, end: 63743 },
        // Private Use Area (plane 0)
        { begin: 12736, end: 12783 },
        // CJK Strokes
        { begin: 64256, end: 64335 },
        // Alphabetic Presentation Forms
        { begin: 64336, end: 65023 },
        // Arabic Presentation Forms-A
        { begin: 65056, end: 65071 },
        // Combining Half Marks
        { begin: 65040, end: 65055 },
        // Vertical Forms
        { begin: 65104, end: 65135 },
        // Small Form Variants
        { begin: 65136, end: 65279 },
        // Arabic Presentation Forms-B
        { begin: 65280, end: 65519 },
        // Halfwidth And Fullwidth Forms
        { begin: 65520, end: 65535 },
        // Specials
        { begin: 3840, end: 4095 },
        // Tibetan
        { begin: 1792, end: 1871 },
        // Syriac
        { begin: 1920, end: 1983 },
        // Thaana
        { begin: 3456, end: 3583 },
        // Sinhala
        { begin: 4096, end: 4255 },
        // Myanmar
        { begin: 4608, end: 4991 },
        // Ethiopic
        { begin: 5024, end: 5119 },
        // Cherokee
        { begin: 5120, end: 5759 },
        // Unified Canadian Aboriginal Syllabics
        { begin: 5760, end: 5791 },
        // Ogham
        { begin: 5792, end: 5887 },
        // Runic
        { begin: 6016, end: 6143 },
        // Khmer
        { begin: 6144, end: 6319 },
        // Mongolian
        { begin: 10240, end: 10495 },
        // Braille Patterns
        { begin: 40960, end: 42127 },
        // Yi Syllables
        { begin: 5888, end: 5919 },
        // Tagalog
        { begin: 66304, end: 66351 },
        // Old Italic
        { begin: 66352, end: 66383 },
        // Gothic
        { begin: 66560, end: 66639 },
        // Deseret
        { begin: 118784, end: 119039 },
        // Byzantine Musical Symbols
        { begin: 119808, end: 120831 },
        // Mathematical Alphanumeric Symbols
        { begin: 1044480, end: 1048573 },
        // Private Use (plane 15)
        { begin: 65024, end: 65039 },
        // Variation Selectors
        { begin: 917504, end: 917631 },
        // Tags
        { begin: 6400, end: 6479 },
        // Limbu
        { begin: 6480, end: 6527 },
        // Tai Le
        { begin: 6528, end: 6623 },
        // New Tai Lue
        { begin: 6656, end: 6687 },
        // Buginese
        { begin: 11264, end: 11359 },
        // Glagolitic
        { begin: 11568, end: 11647 },
        // Tifinagh
        { begin: 19904, end: 19967 },
        // Yijing Hexagram Symbols
        { begin: 43008, end: 43055 },
        // Syloti Nagri
        { begin: 65536, end: 65663 },
        // Linear B Syllabary
        { begin: 65856, end: 65935 },
        // Ancient Greek Numbers
        { begin: 66432, end: 66463 },
        // Ugaritic
        { begin: 66464, end: 66527 },
        // Old Persian
        { begin: 66640, end: 66687 },
        // Shavian
        { begin: 66688, end: 66735 },
        // Osmanya
        { begin: 67584, end: 67647 },
        // Cypriot Syllabary
        { begin: 68096, end: 68191 },
        // Kharoshthi
        { begin: 119552, end: 119647 },
        // Tai Xuan Jing Symbols
        { begin: 73728, end: 74751 },
        // Cuneiform
        { begin: 119648, end: 119679 },
        // Counting Rod Numerals
        { begin: 7040, end: 7103 },
        // Sundanese
        { begin: 7168, end: 7247 },
        // Lepcha
        { begin: 7248, end: 7295 },
        // Ol Chiki
        { begin: 43136, end: 43231 },
        // Saurashtra
        { begin: 43264, end: 43311 },
        // Kayah Li
        { begin: 43312, end: 43359 },
        // Rejang
        { begin: 43520, end: 43615 },
        // Cham
        { begin: 65936, end: 65999 },
        // Ancient Symbols
        { begin: 66e3, end: 66047 },
        // Phaistos Disc
        { begin: 66208, end: 66271 },
        // Carian
        { begin: 127024, end: 127135 }
        // Domino Tiles
      ];
      function getUnicodeRange(unicode) {
        for (let i = 0; i < unicodeRanges.length; i += 1) {
          const range = unicodeRanges[i];
          if (unicode >= range.begin && unicode < range.end) {
            return i;
          }
        }
        return -1;
      }
      function parseOS2Table(data, start) {
        const os2 = {};
        const p = new parse_default.Parser(data, start);
        os2.version = p.parseUShort();
        os2.xAvgCharWidth = p.parseShort();
        os2.usWeightClass = p.parseUShort();
        os2.usWidthClass = p.parseUShort();
        os2.fsType = p.parseUShort();
        os2.ySubscriptXSize = p.parseShort();
        os2.ySubscriptYSize = p.parseShort();
        os2.ySubscriptXOffset = p.parseShort();
        os2.ySubscriptYOffset = p.parseShort();
        os2.ySuperscriptXSize = p.parseShort();
        os2.ySuperscriptYSize = p.parseShort();
        os2.ySuperscriptXOffset = p.parseShort();
        os2.ySuperscriptYOffset = p.parseShort();
        os2.yStrikeoutSize = p.parseShort();
        os2.yStrikeoutPosition = p.parseShort();
        os2.sFamilyClass = p.parseShort();
        os2.panose = [];
        for (let i = 0; i < 10; i++) {
          os2.panose[i] = p.parseByte();
        }
        os2.ulUnicodeRange1 = p.parseULong();
        os2.ulUnicodeRange2 = p.parseULong();
        os2.ulUnicodeRange3 = p.parseULong();
        os2.ulUnicodeRange4 = p.parseULong();
        os2.achVendID = String.fromCharCode(p.parseByte(), p.parseByte(), p.parseByte(), p.parseByte());
        os2.fsSelection = p.parseUShort();
        os2.usFirstCharIndex = p.parseUShort();
        os2.usLastCharIndex = p.parseUShort();
        os2.sTypoAscender = p.parseShort();
        os2.sTypoDescender = p.parseShort();
        os2.sTypoLineGap = p.parseShort();
        os2.usWinAscent = p.parseUShort();
        os2.usWinDescent = p.parseUShort();
        if (os2.version >= 1) {
          os2.ulCodePageRange1 = p.parseULong();
          os2.ulCodePageRange2 = p.parseULong();
        }
        if (os2.version >= 2) {
          os2.sxHeight = p.parseShort();
          os2.sCapHeight = p.parseShort();
          os2.usDefaultChar = p.parseUShort();
          os2.usBreakChar = p.parseUShort();
          os2.usMaxContent = p.parseUShort();
        }
        return os2;
      }
      function makeOS2Table(options) {
        return new table_default.Table("OS/2", [
          { name: "version", type: "USHORT", value: 3 },
          { name: "xAvgCharWidth", type: "SHORT", value: 0 },
          { name: "usWeightClass", type: "USHORT", value: 0 },
          { name: "usWidthClass", type: "USHORT", value: 0 },
          { name: "fsType", type: "USHORT", value: 0 },
          { name: "ySubscriptXSize", type: "SHORT", value: 650 },
          { name: "ySubscriptYSize", type: "SHORT", value: 699 },
          { name: "ySubscriptXOffset", type: "SHORT", value: 0 },
          { name: "ySubscriptYOffset", type: "SHORT", value: 140 },
          { name: "ySuperscriptXSize", type: "SHORT", value: 650 },
          { name: "ySuperscriptYSize", type: "SHORT", value: 699 },
          { name: "ySuperscriptXOffset", type: "SHORT", value: 0 },
          { name: "ySuperscriptYOffset", type: "SHORT", value: 479 },
          { name: "yStrikeoutSize", type: "SHORT", value: 49 },
          { name: "yStrikeoutPosition", type: "SHORT", value: 258 },
          { name: "sFamilyClass", type: "SHORT", value: 0 },
          { name: "bFamilyType", type: "BYTE", value: 0 },
          { name: "bSerifStyle", type: "BYTE", value: 0 },
          { name: "bWeight", type: "BYTE", value: 0 },
          { name: "bProportion", type: "BYTE", value: 0 },
          { name: "bContrast", type: "BYTE", value: 0 },
          { name: "bStrokeVariation", type: "BYTE", value: 0 },
          { name: "bArmStyle", type: "BYTE", value: 0 },
          { name: "bLetterform", type: "BYTE", value: 0 },
          { name: "bMidline", type: "BYTE", value: 0 },
          { name: "bXHeight", type: "BYTE", value: 0 },
          { name: "ulUnicodeRange1", type: "ULONG", value: 0 },
          { name: "ulUnicodeRange2", type: "ULONG", value: 0 },
          { name: "ulUnicodeRange3", type: "ULONG", value: 0 },
          { name: "ulUnicodeRange4", type: "ULONG", value: 0 },
          { name: "achVendID", type: "CHARARRAY", value: "XXXX" },
          { name: "fsSelection", type: "USHORT", value: 0 },
          { name: "usFirstCharIndex", type: "USHORT", value: 0 },
          { name: "usLastCharIndex", type: "USHORT", value: 0 },
          { name: "sTypoAscender", type: "SHORT", value: 0 },
          { name: "sTypoDescender", type: "SHORT", value: 0 },
          { name: "sTypoLineGap", type: "SHORT", value: 0 },
          { name: "usWinAscent", type: "USHORT", value: 0 },
          { name: "usWinDescent", type: "USHORT", value: 0 },
          { name: "ulCodePageRange1", type: "ULONG", value: 0 },
          { name: "ulCodePageRange2", type: "ULONG", value: 0 },
          { name: "sxHeight", type: "SHORT", value: 0 },
          { name: "sCapHeight", type: "SHORT", value: 0 },
          { name: "usDefaultChar", type: "USHORT", value: 0 },
          { name: "usBreakChar", type: "USHORT", value: 0 },
          { name: "usMaxContext", type: "USHORT", value: 0 }
        ], options);
      }
      var os2_default = { parse: parseOS2Table, make: makeOS2Table, unicodeRanges, getUnicodeRange };
      function parsePostTable(data, start) {
        const post = {};
        const p = new parse_default.Parser(data, start);
        post.version = p.parseVersion();
        post.italicAngle = p.parseFixed();
        post.underlinePosition = p.parseShort();
        post.underlineThickness = p.parseShort();
        post.isFixedPitch = p.parseULong();
        post.minMemType42 = p.parseULong();
        post.maxMemType42 = p.parseULong();
        post.minMemType1 = p.parseULong();
        post.maxMemType1 = p.parseULong();
        switch (post.version) {
          case 1:
            post.names = standardNames.slice();
            break;
          case 2:
            post.numberOfGlyphs = p.parseUShort();
            post.glyphNameIndex = new Array(post.numberOfGlyphs);
            for (let i = 0; i < post.numberOfGlyphs; i++) {
              post.glyphNameIndex[i] = p.parseUShort();
            }
            post.names = [];
            for (let i = 0; i < post.numberOfGlyphs; i++) {
              if (post.glyphNameIndex[i] >= standardNames.length) {
                const nameLength = p.parseChar();
                post.names.push(p.parseString(nameLength));
              }
            }
            break;
          case 2.5:
            post.numberOfGlyphs = p.parseUShort();
            post.offset = new Array(post.numberOfGlyphs);
            for (let i = 0; i < post.numberOfGlyphs; i++) {
              post.offset[i] = p.parseChar();
            }
            break;
        }
        return post;
      }
      function makePostTable(font) {
        const {
          italicAngle = Math.round((font.italicAngle || 0) * 65536),
          underlinePosition = 0,
          underlineThickness = 0,
          isFixedPitch = 0,
          minMemType42 = 0,
          maxMemType42 = 0,
          minMemType1 = 0,
          maxMemType1 = 0
        } = font.tables.post || {};
        return new table_default.Table("post", [
          { name: "version", type: "FIXED", value: 196608 },
          { name: "italicAngle", type: "FIXED", value: italicAngle },
          { name: "underlinePosition", type: "FWORD", value: underlinePosition },
          { name: "underlineThickness", type: "FWORD", value: underlineThickness },
          { name: "isFixedPitch", type: "ULONG", value: isFixedPitch },
          { name: "minMemType42", type: "ULONG", value: minMemType42 },
          { name: "maxMemType42", type: "ULONG", value: maxMemType42 },
          { name: "minMemType1", type: "ULONG", value: minMemType1 },
          { name: "maxMemType1", type: "ULONG", value: maxMemType1 }
        ]);
      }
      var post_default = { parse: parsePostTable, make: makePostTable };
      var subtableParsers = new Array(9);
      subtableParsers[1] = function parseLookup1() {
        const start = this.offset + this.relativeOffset;
        const substFormat = this.parseUShort();
        if (substFormat === 1) {
          return {
            substFormat: 1,
            coverage: this.parsePointer(Parser.coverage),
            deltaGlyphId: this.parseShort()
          };
        } else if (substFormat === 2) {
          return {
            substFormat: 2,
            coverage: this.parsePointer(Parser.coverage),
            substitute: this.parseOffset16List()
          };
        }
        check_default.assert(false, "0x" + start.toString(16) + ": lookup type 1 format must be 1 or 2.");
      };
      subtableParsers[2] = function parseLookup2() {
        const substFormat = this.parseUShort();
        check_default.argument(substFormat === 1, "GSUB Multiple Substitution Subtable identifier-format must be 1");
        return {
          substFormat,
          coverage: this.parsePointer(Parser.coverage),
          sequences: this.parseListOfLists()
        };
      };
      subtableParsers[3] = function parseLookup3() {
        const substFormat = this.parseUShort();
        check_default.argument(substFormat === 1, "GSUB Alternate Substitution Subtable identifier-format must be 1");
        return {
          substFormat,
          coverage: this.parsePointer(Parser.coverage),
          alternateSets: this.parseListOfLists()
        };
      };
      subtableParsers[4] = function parseLookup4() {
        const substFormat = this.parseUShort();
        check_default.argument(substFormat === 1, "GSUB ligature table identifier-format must be 1");
        return {
          substFormat,
          coverage: this.parsePointer(Parser.coverage),
          ligatureSets: this.parseListOfLists(function() {
            return {
              ligGlyph: this.parseUShort(),
              components: this.parseUShortList(this.parseUShort() - 1)
            };
          })
        };
      };
      var lookupRecordDesc = {
        sequenceIndex: Parser.uShort,
        lookupListIndex: Parser.uShort
      };
      subtableParsers[5] = function parseLookup5() {
        const start = this.offset + this.relativeOffset;
        const substFormat = this.parseUShort();
        if (substFormat === 1) {
          return {
            substFormat,
            coverage: this.parsePointer(Parser.coverage),
            ruleSets: this.parseListOfLists(function() {
              const glyphCount = this.parseUShort();
              const substCount = this.parseUShort();
              return {
                input: this.parseUShortList(glyphCount - 1),
                lookupRecords: this.parseRecordList(substCount, lookupRecordDesc)
              };
            })
          };
        } else if (substFormat === 2) {
          return {
            substFormat,
            coverage: this.parsePointer(Parser.coverage),
            classDef: this.parsePointer(Parser.classDef),
            classSets: this.parseListOfLists(function() {
              const glyphCount = this.parseUShort();
              const substCount = this.parseUShort();
              return {
                classes: this.parseUShortList(glyphCount - 1),
                lookupRecords: this.parseRecordList(substCount, lookupRecordDesc)
              };
            })
          };
        } else if (substFormat === 3) {
          const glyphCount = this.parseUShort();
          const substCount = this.parseUShort();
          return {
            substFormat,
            coverages: this.parseList(glyphCount, Parser.pointer(Parser.coverage)),
            lookupRecords: this.parseRecordList(substCount, lookupRecordDesc)
          };
        }
        check_default.assert(false, "0x" + start.toString(16) + ": lookup type 5 format must be 1, 2 or 3.");
      };
      subtableParsers[6] = function parseLookup6() {
        const start = this.offset + this.relativeOffset;
        const substFormat = this.parseUShort();
        if (substFormat === 1) {
          return {
            substFormat: 1,
            coverage: this.parsePointer(Parser.coverage),
            chainRuleSets: this.parseListOfLists(function() {
              return {
                backtrack: this.parseUShortList(),
                input: this.parseUShortList(this.parseShort() - 1),
                lookahead: this.parseUShortList(),
                lookupRecords: this.parseRecordList(lookupRecordDesc)
              };
            })
          };
        } else if (substFormat === 2) {
          return {
            substFormat: 2,
            coverage: this.parsePointer(Parser.coverage),
            backtrackClassDef: this.parsePointer(Parser.classDef),
            inputClassDef: this.parsePointer(Parser.classDef),
            lookaheadClassDef: this.parsePointer(Parser.classDef),
            chainClassSet: this.parseListOfLists(function() {
              return {
                backtrack: this.parseUShortList(),
                input: this.parseUShortList(this.parseShort() - 1),
                lookahead: this.parseUShortList(),
                lookupRecords: this.parseRecordList(lookupRecordDesc)
              };
            })
          };
        } else if (substFormat === 3) {
          return {
            substFormat: 3,
            backtrackCoverage: this.parseList(Parser.pointer(Parser.coverage)),
            inputCoverage: this.parseList(Parser.pointer(Parser.coverage)),
            lookaheadCoverage: this.parseList(Parser.pointer(Parser.coverage)),
            lookupRecords: this.parseRecordList(lookupRecordDesc)
          };
        }
        check_default.assert(false, "0x" + start.toString(16) + ": lookup type 6 format must be 1, 2 or 3.");
      };
      subtableParsers[7] = function parseLookup7() {
        const substFormat = this.parseUShort();
        check_default.argument(substFormat === 1, "GSUB Extension Substitution subtable identifier-format must be 1");
        const extensionLookupType = this.parseUShort();
        const extensionParser = new Parser(this.data, this.offset + this.parseULong());
        return {
          substFormat: 1,
          lookupType: extensionLookupType,
          extension: subtableParsers[extensionLookupType].call(extensionParser)
        };
      };
      subtableParsers[8] = function parseLookup8() {
        const substFormat = this.parseUShort();
        check_default.argument(substFormat === 1, "GSUB Reverse Chaining Contextual Single Substitution Subtable identifier-format must be 1");
        return {
          substFormat,
          coverage: this.parsePointer(Parser.coverage),
          backtrackCoverage: this.parseList(Parser.pointer(Parser.coverage)),
          lookaheadCoverage: this.parseList(Parser.pointer(Parser.coverage)),
          substitutes: this.parseUShortList()
        };
      };
      function parseGsubTable(data, start) {
        start = start || 0;
        const p = new Parser(data, start);
        const tableVersion = p.parseVersion(1);
        check_default.argument(tableVersion === 1 || tableVersion === 1.1, "Unsupported GSUB table version.");
        if (tableVersion === 1) {
          return {
            version: tableVersion,
            scripts: p.parseScriptList(),
            features: p.parseFeatureList(),
            lookups: p.parseLookupList(subtableParsers)
          };
        } else {
          return {
            version: tableVersion,
            scripts: p.parseScriptList(),
            features: p.parseFeatureList(),
            lookups: p.parseLookupList(subtableParsers),
            variations: p.parseFeatureVariationsList()
          };
        }
      }
      var subtableMakers = new Array(9);
      subtableMakers[1] = function makeLookup1(subtable) {
        if (subtable.substFormat === 1) {
          return new table_default.Table("substitutionTable", [
            { name: "substFormat", type: "USHORT", value: 1 },
            { name: "coverage", type: "TABLE", value: new table_default.Coverage(subtable.coverage) },
            { name: "deltaGlyphID", type: "SHORT", value: subtable.deltaGlyphId }
          ]);
        } else if (subtable.substFormat === 2) {
          return new table_default.Table("substitutionTable", [
            { name: "substFormat", type: "USHORT", value: 2 },
            { name: "coverage", type: "TABLE", value: new table_default.Coverage(subtable.coverage) }
          ].concat(table_default.ushortList("substitute", subtable.substitute)));
        }
        check_default.fail("Lookup type 1 substFormat must be 1 or 2.");
      };
      subtableMakers[2] = function makeLookup2(subtable) {
        check_default.assert(subtable.substFormat === 1, "Lookup type 2 substFormat must be 1.");
        return new table_default.Table("substitutionTable", [
          { name: "substFormat", type: "USHORT", value: 1 },
          { name: "coverage", type: "TABLE", value: new table_default.Coverage(subtable.coverage) }
        ].concat(table_default.tableList("seqSet", subtable.sequences, function(sequenceSet) {
          return new table_default.Table("sequenceSetTable", table_default.ushortList("sequence", sequenceSet));
        })));
      };
      subtableMakers[3] = function makeLookup3(subtable) {
        check_default.assert(subtable.substFormat === 1, "Lookup type 3 substFormat must be 1.");
        return new table_default.Table("substitutionTable", [
          { name: "substFormat", type: "USHORT", value: 1 },
          { name: "coverage", type: "TABLE", value: new table_default.Coverage(subtable.coverage) }
        ].concat(table_default.tableList("altSet", subtable.alternateSets, function(alternateSet) {
          return new table_default.Table("alternateSetTable", table_default.ushortList("alternate", alternateSet));
        })));
      };
      subtableMakers[4] = function makeLookup4(subtable) {
        check_default.assert(subtable.substFormat === 1, "Lookup type 4 substFormat must be 1.");
        return new table_default.Table("substitutionTable", [
          { name: "substFormat", type: "USHORT", value: 1 },
          { name: "coverage", type: "TABLE", value: new table_default.Coverage(subtable.coverage) }
        ].concat(table_default.tableList("ligSet", subtable.ligatureSets, function(ligatureSet) {
          return new table_default.Table("ligatureSetTable", table_default.tableList("ligature", ligatureSet, function(ligature) {
            return new table_default.Table(
              "ligatureTable",
              [{ name: "ligGlyph", type: "USHORT", value: ligature.ligGlyph }].concat(table_default.ushortList("component", ligature.components, ligature.components.length + 1))
            );
          }));
        })));
      };
      subtableMakers[5] = function makeLookup5(subtable) {
        if (subtable.substFormat === 1) {
          return new table_default.Table("contextualSubstitutionTable", [
            { name: "substFormat", type: "USHORT", value: subtable.substFormat },
            { name: "coverage", type: "TABLE", value: new table_default.Coverage(subtable.coverage) }
          ].concat(table_default.tableList("sequenceRuleSet", subtable.ruleSets, function(sequenceRuleSet) {
            if (!sequenceRuleSet) {
              return new table_default.Table("NULL", null);
            }
            return new table_default.Table("sequenceRuleSetTable", table_default.tableList("sequenceRule", sequenceRuleSet, function(sequenceRule) {
              let tableData = table_default.ushortList("seqLookup", [], sequenceRule.lookupRecords.length).concat(table_default.ushortList("inputSequence", sequenceRule.input, sequenceRule.input.length + 1));
              [tableData[0], tableData[1]] = [tableData[1], tableData[0]];
              for (let i = 0; i < sequenceRule.lookupRecords.length; i++) {
                const record = sequenceRule.lookupRecords[i];
                tableData = tableData.concat({ name: "sequenceIndex" + i, type: "USHORT", value: record.sequenceIndex }).concat({ name: "lookupListIndex" + i, type: "USHORT", value: record.lookupListIndex });
              }
              return new table_default.Table("sequenceRuleTable", tableData);
            }));
          })));
        } else if (subtable.substFormat === 2) {
          return new table_default.Table("contextualSubstitutionTable", [
            { name: "substFormat", type: "USHORT", value: subtable.substFormat },
            { name: "coverage", type: "TABLE", value: new table_default.Coverage(subtable.coverage) },
            { name: "classDef", type: "TABLE", value: new table_default.ClassDef(subtable.classDef) }
          ].concat(table_default.tableList("classSeqRuleSet", subtable.classSets, function(classSeqRuleSet) {
            if (!classSeqRuleSet) {
              return new table_default.Table("NULL", null);
            }
            return new table_default.Table("classSeqRuleSetTable", table_default.tableList("classSeqRule", classSeqRuleSet, function(classSeqRule) {
              let tableData = table_default.ushortList("classes", classSeqRule.classes, classSeqRule.classes.length + 1).concat(table_default.ushortList("seqLookupCount", [], classSeqRule.lookupRecords.length));
              for (let i = 0; i < classSeqRule.lookupRecords.length; i++) {
                const record = classSeqRule.lookupRecords[i];
                tableData = tableData.concat({ name: "sequenceIndex" + i, type: "USHORT", value: record.sequenceIndex }).concat({ name: "lookupListIndex" + i, type: "USHORT", value: record.lookupListIndex });
              }
              return new table_default.Table("classSeqRuleTable", tableData);
            }));
          })));
        } else if (subtable.substFormat === 3) {
          let tableData = [
            { name: "substFormat", type: "USHORT", value: subtable.substFormat }
          ];
          tableData.push({ name: "inputGlyphCount", type: "USHORT", value: subtable.coverages.length });
          tableData.push({ name: "substitutionCount", type: "USHORT", value: subtable.lookupRecords.length });
          for (let i = 0; i < subtable.coverages.length; i++) {
            const coverage = subtable.coverages[i];
            tableData.push({ name: "inputCoverage" + i, type: "TABLE", value: new table_default.Coverage(coverage) });
          }
          for (let i = 0; i < subtable.lookupRecords.length; i++) {
            const record = subtable.lookupRecords[i];
            tableData = tableData.concat({ name: "sequenceIndex" + i, type: "USHORT", value: record.sequenceIndex }).concat({ name: "lookupListIndex" + i, type: "USHORT", value: record.lookupListIndex });
          }
          let returnTable = new table_default.Table("contextualSubstitutionTable", tableData);
          return returnTable;
        }
        check_default.assert(false, "lookup type 5 format must be 1, 2 or 3.");
      };
      subtableMakers[6] = function makeLookup6(subtable) {
        if (subtable.substFormat === 1) {
          let returnTable = new table_default.Table("chainContextTable", [
            { name: "substFormat", type: "USHORT", value: subtable.substFormat },
            { name: "coverage", type: "TABLE", value: new table_default.Coverage(subtable.coverage) }
          ].concat(table_default.tableList("chainRuleSet", subtable.chainRuleSets, function(chainRuleSet) {
            return new table_default.Table("chainRuleSetTable", table_default.tableList("chainRule", chainRuleSet, function(chainRule) {
              let tableData = table_default.ushortList("backtrackGlyph", chainRule.backtrack, chainRule.backtrack.length).concat(table_default.ushortList("inputGlyph", chainRule.input, chainRule.input.length + 1)).concat(table_default.ushortList("lookaheadGlyph", chainRule.lookahead, chainRule.lookahead.length)).concat(table_default.ushortList("substitution", [], chainRule.lookupRecords.length));
              for (let i = 0; i < chainRule.lookupRecords.length; i++) {
                const record = chainRule.lookupRecords[i];
                tableData = tableData.concat({ name: "sequenceIndex" + i, type: "USHORT", value: record.sequenceIndex }).concat({ name: "lookupListIndex" + i, type: "USHORT", value: record.lookupListIndex });
              }
              return new table_default.Table("chainRuleTable", tableData);
            }));
          })));
          return returnTable;
        } else if (subtable.substFormat === 2) {
          check_default.assert(false, "lookup type 6 format 2 is not yet supported.");
        } else if (subtable.substFormat === 3) {
          let tableData = [
            { name: "substFormat", type: "USHORT", value: subtable.substFormat }
          ];
          tableData.push({ name: "backtrackGlyphCount", type: "USHORT", value: subtable.backtrackCoverage.length });
          for (let i = 0; i < subtable.backtrackCoverage.length; i++) {
            const coverage = subtable.backtrackCoverage[i];
            tableData.push({ name: "backtrackCoverage" + i, type: "TABLE", value: new table_default.Coverage(coverage) });
          }
          tableData.push({ name: "inputGlyphCount", type: "USHORT", value: subtable.inputCoverage.length });
          for (let i = 0; i < subtable.inputCoverage.length; i++) {
            const coverage = subtable.inputCoverage[i];
            tableData.push({ name: "inputCoverage" + i, type: "TABLE", value: new table_default.Coverage(coverage) });
          }
          tableData.push({ name: "lookaheadGlyphCount", type: "USHORT", value: subtable.lookaheadCoverage.length });
          for (let i = 0; i < subtable.lookaheadCoverage.length; i++) {
            const coverage = subtable.lookaheadCoverage[i];
            tableData.push({ name: "lookaheadCoverage" + i, type: "TABLE", value: new table_default.Coverage(coverage) });
          }
          tableData.push({ name: "substitutionCount", type: "USHORT", value: subtable.lookupRecords.length });
          for (let i = 0; i < subtable.lookupRecords.length; i++) {
            const record = subtable.lookupRecords[i];
            tableData = tableData.concat({ name: "sequenceIndex" + i, type: "USHORT", value: record.sequenceIndex }).concat({ name: "lookupListIndex" + i, type: "USHORT", value: record.lookupListIndex });
          }
          let returnTable = new table_default.Table("chainContextTable", tableData);
          return returnTable;
        }
        check_default.assert(false, "lookup type 6 format must be 1, 2 or 3.");
      };
      function makeGsubTable(gsub) {
        return new table_default.Table("GSUB", [
          { name: "version", type: "ULONG", value: 65536 },
          { name: "scripts", type: "TABLE", value: new table_default.ScriptList(gsub.scripts) },
          { name: "features", type: "TABLE", value: new table_default.FeatureList(gsub.features) },
          { name: "lookups", type: "TABLE", value: new table_default.LookupList(gsub.lookups, subtableMakers) }
        ]);
      }
      var gsub_default = { parse: parseGsubTable, make: makeGsubTable };
      function parseMetaTable(data, start) {
        const p = new parse_default.Parser(data, start);
        const tableVersion = p.parseULong();
        check_default.argument(tableVersion === 1, "Unsupported META table version.");
        p.parseULong();
        p.parseULong();
        const numDataMaps = p.parseULong();
        const tags = {};
        for (let i = 0; i < numDataMaps; i++) {
          const tag = p.parseTag();
          const dataOffset = p.parseULong();
          const dataLength = p.parseULong();
          if (tag === "appl" || tag === "bild")
            continue;
          const text = decode.UTF8(data, start + dataOffset, dataLength);
          tags[tag] = text;
        }
        return tags;
      }
      function makeMetaTable(tags) {
        const numTags = Object.keys(tags).length;
        let stringPool = "";
        const stringPoolOffset = 16 + numTags * 12;
        const result = new table_default.Table("meta", [
          { name: "version", type: "ULONG", value: 1 },
          { name: "flags", type: "ULONG", value: 0 },
          { name: "offset", type: "ULONG", value: stringPoolOffset },
          { name: "numTags", type: "ULONG", value: numTags }
        ]);
        for (let tag in tags) {
          const pos = stringPool.length;
          stringPool += tags[tag];
          result.fields.push({ name: "tag " + tag, type: "TAG", value: tag });
          result.fields.push({ name: "offset " + tag, type: "ULONG", value: stringPoolOffset + pos });
          result.fields.push({ name: "length " + tag, type: "ULONG", value: tags[tag].length });
        }
        result.fields.push({ name: "stringPool", type: "CHARARRAY", value: stringPool });
        return result;
      }
      var meta_default = { parse: parseMetaTable, make: makeMetaTable };
      function parseColrTable(data, start) {
        const p = new Parser(data, start);
        const version = p.parseUShort();
        if (version !== 0) {
          console.warn("Only COLRv0 is currently fully supported. A subset of color glyphs might be available in this font if provided in the v0 format.");
        }
        const numBaseGlyphRecords = p.parseUShort();
        const baseGlyphRecordsOffset = p.parseOffset32();
        const layerRecordsOffset = p.parseOffset32();
        const numLayerRecords = p.parseUShort();
        p.relativeOffset = baseGlyphRecordsOffset;
        const baseGlyphRecords = p.parseRecordList(numBaseGlyphRecords, {
          glyphID: Parser.uShort,
          firstLayerIndex: Parser.uShort,
          numLayers: Parser.uShort
        });
        p.relativeOffset = layerRecordsOffset;
        const layerRecords = p.parseRecordList(numLayerRecords, {
          glyphID: Parser.uShort,
          paletteIndex: Parser.uShort
        });
        return {
          version,
          baseGlyphRecords,
          layerRecords
        };
      }
      function makeColrTable({ version = 0, baseGlyphRecords = [], layerRecords = [] }) {
        check_default.argument(version === 0, "Only COLRv0 supported.");
        const baseGlyphRecordsOffset = 14;
        const layerRecordsOffset = baseGlyphRecordsOffset + baseGlyphRecords.length * 6;
        return new table_default.Table("COLR", [
          { name: "version", type: "USHORT", value: version },
          { name: "numBaseGlyphRecords", type: "USHORT", value: baseGlyphRecords.length },
          { name: "baseGlyphRecordsOffset", type: "ULONG", value: baseGlyphRecordsOffset },
          { name: "layerRecordsOffset", type: "ULONG", value: layerRecordsOffset },
          { name: "numLayerRecords", type: "USHORT", value: layerRecords.length },
          ...baseGlyphRecords.map((glyph, i) => [
            { name: "glyphID_" + i, type: "USHORT", value: glyph.glyphID },
            { name: "firstLayerIndex_" + i, type: "USHORT", value: glyph.firstLayerIndex },
            { name: "numLayers_" + i, type: "USHORT", value: glyph.numLayers }
          ]).flat(),
          ...layerRecords.map((layer, i) => [
            { name: "LayerGlyphID_" + i, type: "USHORT", value: layer.glyphID },
            { name: "paletteIndex_" + i, type: "USHORT", value: layer.paletteIndex }
          ]).flat()
        ]);
      }
      var colr_default = { parse: parseColrTable, make: makeColrTable };
      function makeFvarAxis(n, axis) {
        return [
          { name: "tag_" + n, type: "TAG", value: axis.tag },
          { name: "minValue_" + n, type: "FIXED", value: axis.minValue << 16 },
          { name: "defaultValue_" + n, type: "FIXED", value: axis.defaultValue << 16 },
          { name: "maxValue_" + n, type: "FIXED", value: axis.maxValue << 16 },
          { name: "flags_" + n, type: "USHORT", value: 0 },
          { name: "nameID_" + n, type: "USHORT", value: axis.axisNameID }
        ];
      }
      function parseFvarAxis(data, start, names) {
        const axis = {};
        const p = new parse_default.Parser(data, start);
        axis.tag = p.parseTag();
        axis.minValue = p.parseFixed();
        axis.defaultValue = p.parseFixed();
        axis.maxValue = p.parseFixed();
        p.skip("uShort", 1);
        const axisNameID = p.parseUShort();
        axis.axisNameID = axisNameID;
        axis.name = getNameByID(names, axisNameID);
        return axis;
      }
      function makeFvarInstance(n, inst, axes, optionalFields = {}) {
        const fields = [
          { name: "nameID_" + n, type: "USHORT", value: inst.subfamilyNameID },
          { name: "flags_" + n, type: "USHORT", value: 0 }
        ];
        for (let i = 0; i < axes.length; ++i) {
          const axisTag = axes[i].tag;
          fields.push({
            name: "axis_" + n + " " + axisTag,
            type: "FIXED",
            value: inst.coordinates[axisTag] << 16
          });
        }
        if (optionalFields && optionalFields.postScriptNameID) {
          fields.push({
            name: "postScriptNameID_",
            type: "USHORT",
            value: inst.postScriptNameID !== void 0 ? inst.postScriptNameID : 65535
          });
        }
        return fields;
      }
      function parseFvarInstance(data, start, axes, names, instanceSize) {
        const inst = {};
        const p = new parse_default.Parser(data, start);
        const subfamilyNameID = p.parseUShort();
        inst.subfamilyNameID = subfamilyNameID;
        inst.name = getNameByID(names, subfamilyNameID, [2, 17]);
        p.skip("uShort", 1);
        inst.coordinates = {};
        for (let i = 0; i < axes.length; ++i) {
          inst.coordinates[axes[i].tag] = p.parseFixed();
        }
        if (p.relativeOffset === instanceSize) {
          inst.postScriptNameID = void 0;
          inst.postScriptName = void 0;
          return inst;
        }
        const postScriptNameID = p.parseUShort();
        inst.postScriptNameID = postScriptNameID == 65535 ? void 0 : postScriptNameID;
        inst.postScriptName = inst.postScriptNameID !== void 0 ? getNameByID(names, postScriptNameID, [6]) : "";
        return inst;
      }
      function makeFvarTable(fvar, names) {
        const result = new table_default.Table("fvar", [
          { name: "version", type: "ULONG", value: 65536 },
          { name: "offsetToData", type: "USHORT", value: 0 },
          { name: "countSizePairs", type: "USHORT", value: 2 },
          { name: "axisCount", type: "USHORT", value: fvar.axes.length },
          { name: "axisSize", type: "USHORT", value: 20 },
          { name: "instanceCount", type: "USHORT", value: fvar.instances.length },
          { name: "instanceSize", type: "USHORT", value: 4 + fvar.axes.length * 4 }
        ]);
        result.offsetToData = result.sizeOf();
        for (let i = 0; i < fvar.axes.length; i++) {
          result.fields = result.fields.concat(makeFvarAxis(i, fvar.axes[i], names));
        }
        const optionalFields = {};
        for (let j = 0; j < fvar.instances.length; j++) {
          if (fvar.instances[j].postScriptNameID !== void 0) {
            result.instanceSize += 2;
            optionalFields.postScriptNameID = true;
            break;
          }
        }
        for (let j = 0; j < fvar.instances.length; j++) {
          result.fields = result.fields.concat(makeFvarInstance(
            j,
            fvar.instances[j],
            fvar.axes,
            optionalFields
          ));
        }
        return result;
      }
      function parseFvarTable(data, start, names) {
        const p = new parse_default.Parser(data, start);
        const tableVersion = p.parseULong();
        check_default.argument(tableVersion === 65536, "Unsupported fvar table version.");
        const offsetToData = p.parseOffset16();
        p.skip("uShort", 1);
        const axisCount = p.parseUShort();
        const axisSize = p.parseUShort();
        const instanceCount = p.parseUShort();
        const instanceSize = p.parseUShort();
        const axes = [];
        for (let i = 0; i < axisCount; i++) {
          axes.push(parseFvarAxis(data, start + offsetToData + i * axisSize, names));
        }
        const instances = [];
        const instanceStart = start + offsetToData + axisCount * axisSize;
        for (let j = 0; j < instanceCount; j++) {
          instances.push(parseFvarInstance(data, instanceStart + j * instanceSize, axes, names, instanceSize));
        }
        return { axes, instances };
      }
      var fvar_default = { make: makeFvarTable, parse: parseFvarTable };
      var axisRecordStruct = {
        tag: Parser.tag,
        nameID: Parser.uShort,
        ordering: Parser.uShort
      };
      var axisValueParsers = new Array(5);
      axisValueParsers[1] = function axisValueParser1() {
        return {
          axisIndex: this.parseUShort(),
          flags: this.parseUShort(),
          valueNameID: this.parseUShort(),
          value: this.parseFixed()
        };
      };
      axisValueParsers[2] = function axisValueParser2() {
        return {
          axisIndex: this.parseUShort(),
          flags: this.parseUShort(),
          valueNameID: this.parseUShort(),
          nominalValue: this.parseFixed(),
          rangeMinValue: this.parseFixed(),
          rangeMaxValue: this.parseFixed()
        };
      };
      axisValueParsers[3] = function axisValueParser3() {
        return {
          axisIndex: this.parseUShort(),
          flags: this.parseUShort(),
          valueNameID: this.parseUShort(),
          value: this.parseFixed(),
          linkedValue: this.parseFixed()
        };
      };
      axisValueParsers[4] = function axisValueParser4() {
        const axisCount = this.parseUShort();
        return {
          flags: this.parseUShort(),
          valueNameID: this.parseUShort(),
          axisValues: this.parseList(axisCount, function() {
            return {
              axisIndex: this.parseUShort(),
              value: this.parseFixed()
            };
          })
        };
      };
      function parseSTATAxisValue() {
        const valueTableFormat = this.parseUShort();
        const axisValueParser = axisValueParsers[valueTableFormat];
        const formatStub = {
          format: valueTableFormat
        };
        if (axisValueParser === void 0) {
          console.warn(`Unknown axis value table format ${valueTableFormat}`);
          return formatStub;
        }
        return Object.assign(formatStub, this.parseStruct(axisValueParser.bind(this)));
      }
      function parseSTATTable(data, start, fvar) {
        if (!start) {
          start = 0;
        }
        const p = new parse_default.Parser(data, start);
        const tableVersionMajor = p.parseUShort();
        const tableVersionMinor = p.parseUShort();
        if (tableVersionMajor !== 1) {
          console.warn(`Unsupported STAT table version ${tableVersionMajor}.${tableVersionMinor}`);
        }
        const version = [
          tableVersionMajor,
          tableVersionMinor
        ];
        const designAxisSize = p.parseUShort();
        const designAxisCount = p.parseUShort();
        const designAxesOffset = p.parseOffset32();
        const axisValueCount = p.parseUShort();
        const offsetToAxisValueOffsets = p.parseOffset32();
        const elidedFallbackNameID = tableVersionMajor > 1 || tableVersionMinor > 0 ? p.parseUShort() : void 0;
        if (fvar !== void 0) {
          check_default.argument(designAxisCount >= fvar.axes.length, "STAT axis count must be greater than or equal to fvar axis count");
        }
        if (axisValueCount > 0) {
          check_default.argument(designAxisCount >= 0, "STAT axis count must be greater than 0 if STAT axis value count is greater than 0");
        }
        const axes = [];
        for (let i = 0; i < designAxisCount; i++) {
          p.offset = start + designAxesOffset;
          p.relativeOffset = i * designAxisSize;
          axes.push(p.parseStruct(axisRecordStruct));
        }
        p.offset = start;
        p.relativeOffset = offsetToAxisValueOffsets;
        const valueOffsets = p.parseUShortList(axisValueCount);
        const values = [];
        for (let i = 0; i < axisValueCount; i++) {
          p.offset = start + offsetToAxisValueOffsets;
          p.relativeOffset = valueOffsets[i];
          values.push(parseSTATAxisValue.apply(p));
        }
        return {
          version,
          axes,
          values,
          elidedFallbackNameID
        };
      }
      var axisValueMakers = new Array(5);
      axisValueMakers[1] = function axisValueMaker1(n, table) {
        return [
          { name: `format${n}`, type: "USHORT", value: 1 },
          { name: `axisIndex${n}`, type: "USHORT", value: table.axisIndex },
          { name: `flags${n}`, type: "USHORT", value: table.flags },
          { name: `valueNameID${n}`, type: "USHORT", value: table.valueNameID },
          { name: `value${n}`, type: "FLOAT", value: table.value }
        ];
      };
      axisValueMakers[2] = function axisValueMaker2(n, table) {
        return [
          { name: `format${n}`, type: "USHORT", value: 2 },
          { name: `axisIndex${n}`, type: "USHORT", value: table.axisIndex },
          { name: `flags${n}`, type: "USHORT", value: table.flags },
          { name: `valueNameID${n}`, type: "USHORT", value: table.valueNameID },
          { name: `nominalValue${n}`, type: "FLOAT", value: table.nominalValue },
          { name: `rangeMinValue${n}`, type: "FLOAT", value: table.rangeMinValue },
          { name: `rangeMaxValue${n}`, type: "FLOAT", value: table.rangeMaxValue }
        ];
      };
      axisValueMakers[3] = function axisValueMaker3(n, table) {
        return [
          { name: `format${n}`, type: "USHORT", value: 3 },
          { name: `axisIndex${n}`, type: "USHORT", value: table.axisIndex },
          { name: `flags${n}`, type: "USHORT", value: table.flags },
          { name: `valueNameID${n}`, type: "USHORT", value: table.valueNameID },
          { name: `value${n}`, type: "FLOAT", value: table.value },
          { name: `linkedValue${n}`, type: "FLOAT", value: table.linkedValue }
        ];
      };
      axisValueMakers[4] = function axisValueMaker4(n, table) {
        let returnFields = [
          { name: `format${n}`, type: "USHORT", value: 4 },
          { name: `axisCount${n}`, type: "USHORT", value: table.axisValues.length },
          { name: `flags${n}`, type: "USHORT", value: table.flags },
          { name: `valueNameID${n}`, type: "USHORT", value: table.valueNameID }
        ];
        for (let i = 0; i < table.axisValues.length; i++) {
          returnFields = returnFields.concat([
            { name: `format${n}axisIndex${i}`, type: "USHORT", value: table.axisValues[i].axisIndex },
            { name: `format${n}value${i}`, type: "FLOAT", value: table.axisValues[i].value }
          ]);
        }
        return returnFields;
      };
      function makeSTATAxisRecord(n, axis) {
        return new table_default.Record("axisRecord_" + n, [
          { name: "axisTag_" + n, type: "TAG", value: axis.tag },
          { name: "axisNameID_" + n, type: "USHORT", value: axis.nameID },
          { name: "axisOrdering_" + n, type: "USHORT", value: axis.ordering }
        ]);
      }
      function makeSTATValueTable(n, tableData) {
        const valueTableFormat = tableData.format;
        const axisValueMaker = axisValueMakers[valueTableFormat];
        check_default.argument(axisValueMaker !== void 0, `Unknown axis value table format ${valueTableFormat}`);
        const fields = axisValueMaker(n, tableData);
        return new table_default.Table("axisValueTable_" + n, fields);
      }
      function makeSTATTable(STAT) {
        const result = new table_default.Table("STAT", [
          { name: "majorVersion", type: "USHORT", value: 1 },
          { name: "minorVersion", type: "USHORT", value: 2 },
          { name: "designAxisSize", type: "USHORT", value: 8 },
          { name: "designAxisCount", type: "USHORT", value: STAT.axes.length },
          { name: "designAxesOffset", type: "ULONG", value: 0 },
          { name: "axisValueCount", type: "USHORT", value: STAT.values.length },
          { name: "offsetToAxisValueOffsets", type: "ULONG", value: 0 },
          { name: "elidedFallbackNameID", type: "USHORT", value: STAT.elidedFallbackNameID }
        ]);
        result.designAxesOffset = result.offsetToAxisValueOffsets = result.sizeOf();
        for (let i = 0; i < STAT.axes.length; i++) {
          const axisRecord = makeSTATAxisRecord(i, STAT.axes[i]);
          result.offsetToAxisValueOffsets += axisRecord.sizeOf();
          result.fields = result.fields.concat(axisRecord.fields);
        }
        const axisValueOffsets = [];
        let axisValueTables = [];
        let axisValueTableOffset = STAT.values.length * 2;
        for (let j = 0; j < STAT.values.length; j++) {
          const axisValueTable = makeSTATValueTable(j, STAT.values[j]);
          axisValueOffsets.push({
            name: "offset_" + j,
            type: "USHORT",
            value: axisValueTableOffset
          });
          axisValueTableOffset += axisValueTable.sizeOf();
          axisValueTables = axisValueTables.concat(axisValueTable.fields);
        }
        result.fields = result.fields.concat(axisValueOffsets);
        result.fields = result.fields.concat(axisValueTables);
        return result;
      }
      var stat_default = { make: makeSTATTable, parse: parseSTATTable };
      function makeAvarAxisValueMap(n, axisValueMap) {
        return new table_default.Record("axisValueMap_" + n, [
          { name: "fromCoordinate_" + n, type: "F2DOT14", value: axisValueMap.fromCoordinate },
          { name: "toCoordinate_" + n, type: "F2DOT14", value: axisValueMap.toCoordinate }
        ]);
      }
      function makeAvarSegmentMap(n, axis) {
        const returnTable = new table_default.Record("segmentMap_" + n, [
          { name: "positionMapCount_" + n, type: "USHORT", value: axis.axisValueMaps.length }
        ]);
        let axisValueMaps = [];
        for (let i = 0; i < axis.axisValueMaps.length; i++) {
          const valueMap = makeAvarAxisValueMap(`${n}_${i}`, axis.axisValueMaps[i]);
          axisValueMaps = axisValueMaps.concat(valueMap.fields);
        }
        returnTable.fields = returnTable.fields.concat(axisValueMaps);
        return returnTable;
      }
      function makeAvarTable(avar, fvar) {
        check_default.argument(avar.axisSegmentMaps.length === fvar.axes.length, "avar axis count must correspond to fvar axis count");
        const result = new table_default.Table("avar", [
          { name: "majorVersion", type: "USHORT", value: 1 },
          { name: "minorVersion", type: "USHORT", value: 0 },
          { name: "reserved", type: "USHORT", value: 0 },
          { name: "axisCount", type: "USHORT", value: avar.axisSegmentMaps.length }
        ]);
        for (let i = 0; i < avar.axisSegmentMaps.length; i++) {
          const axisRecord = makeAvarSegmentMap(i, avar.axisSegmentMaps[i]);
          result.fields = result.fields.concat(axisRecord.fields);
        }
        return result;
      }
      function parseAvarTable(data, start, fvar) {
        if (!start) {
          start = 0;
        }
        const p = new Parser(data, start);
        const tableVersionMajor = p.parseUShort();
        const tableVersionMinor = p.parseUShort();
        if (tableVersionMajor !== 1) {
          console.warn(`Unsupported avar table version ${tableVersionMajor}.${tableVersionMinor}`);
        }
        p.skip("uShort", 1);
        const axisCount = p.parseUShort();
        check_default.argument(axisCount === fvar.axes.length, "avar axis count must correspond to fvar axis count");
        const axisSegmentMaps = [];
        for (let i = 0; i < axisCount; i++) {
          const axisValueMaps = [];
          const positionMapCount = p.parseUShort();
          for (let j = 0; j < positionMapCount; j++) {
            const fromCoordinate = p.parseF2Dot14();
            const toCoordinate = p.parseF2Dot14();
            axisValueMaps.push({
              fromCoordinate,
              toCoordinate
            });
          }
          axisSegmentMaps.push({
            axisValueMaps
          });
        }
        return {
          version: [tableVersionMajor, tableVersionMinor],
          axisSegmentMaps
        };
      }
      var avar_default = { make: makeAvarTable, parse: parseAvarTable };
      function parseCvarTable(data, start, fvar, cvt) {
        const p = new parse_default.Parser(data, start);
        const cvtVariations = p.parseTupleVariationStore(
          p.relativeOffset,
          fvar.axes.length,
          "cvar",
          cvt
        );
        const tableVersionMajor = p.parseUShort();
        const tableVersionMinor = p.parseUShort();
        if (tableVersionMajor !== 1) {
          console.warn(`Unsupported cvar table version ${tableVersionMajor}.${tableVersionMinor}`);
        }
        return {
          version: [tableVersionMajor, tableVersionMinor],
          ...cvtVariations
        };
      }
      function makeCvarTable() {
        console.warn("Writing of cvar tables is not yet supported.");
      }
      var cvar_default = { make: makeCvarTable, parse: parseCvarTable };
      function parseGvarTable(data, start, fvar, glyphs) {
        const p = new parse_default.Parser(data, start);
        const tableVersionMajor = p.parseUShort();
        const tableVersionMinor = p.parseUShort();
        if (tableVersionMajor !== 1) {
          console.warn(`Unsupported gvar table version ${tableVersionMajor}.${tableVersionMinor}`);
        }
        const axisCount = p.parseUShort();
        if (axisCount !== fvar.axes.length) {
          console.warn(`axisCount ${axisCount} in gvar table does not match the number of axes ${fvar.axes.length} in the fvar table!`);
        }
        const sharedTupleCount = p.parseUShort();
        const sharedTuples = p.parsePointer32(function() {
          return this.parseTupleRecords(sharedTupleCount, axisCount);
        });
        const glyphVariations = p.parseTupleVariationStoreList(axisCount, "gvar", glyphs);
        return {
          version: [tableVersionMajor, tableVersionMinor],
          sharedTuples,
          glyphVariations
        };
      }
      function makeGvarTable() {
        console.warn("Writing of gvar tables is not yet supported.");
      }
      var gvar_default = { make: makeGvarTable, parse: parseGvarTable };
      function parseGaspTable(data, start) {
        const gasp = {};
        const p = new parse_default.Parser(data, start);
        gasp.version = p.parseUShort();
        check_default.argument(gasp.version <= 1, "Unsupported gasp table version.");
        gasp.numRanges = p.parseUShort();
        gasp.gaspRanges = [];
        for (let i = 0; i < gasp.numRanges; i++) {
          gasp.gaspRanges[i] = {
            rangeMaxPPEM: p.parseUShort(),
            rangeGaspBehavior: p.parseUShort()
          };
        }
        return gasp;
      }
      function makeGaspTable(gasp) {
        const result = new table_default.Table("gasp", [
          { name: "version", type: "USHORT", value: 1 },
          { name: "numRanges", type: "USHORT", value: gasp.numRanges }
        ]);
        for (let i in gasp.gaspRanges) {
          result.fields.push({ name: "rangeMaxPPEM", type: "USHORT", value: gasp.gaspRanges[i].rangeMaxPPEM });
          result.fields.push({ name: "rangeGaspBehavior", type: "USHORT", value: gasp.gaspRanges[i].rangeGaspBehavior });
        }
        return result;
      }
      var gasp_default = { parse: parseGaspTable, make: makeGaspTable };
      function parseSvgTable(data, offset) {
        const svgTable = /* @__PURE__ */ new Map();
        const buf = data.buffer;
        const p = new Parser(data, offset);
        const version = p.parseUShort();
        if (version !== 0) return svgTable;
        p.relativeOffset = p.parseOffset32();
        const svgDocumentListOffset = data.byteOffset + offset + p.relativeOffset;
        const numEntries = p.parseUShort();
        const svgDocMap = /* @__PURE__ */ new Map();
        for (let i = 0; i < numEntries; i++) {
          const startGlyphID = p.parseUShort();
          const endGlyphID = p.parseUShort();
          const svgDocOffset = svgDocumentListOffset + p.parseOffset32();
          const svgDocLength = p.parseULong();
          let svgDoc = svgDocMap.get(svgDocOffset);
          if (svgDoc === void 0) {
            svgDoc = new Uint8Array(buf, svgDocOffset, svgDocLength);
            svgDocMap.set(svgDocOffset, svgDoc);
          }
          for (let i2 = startGlyphID; i2 <= endGlyphID; i2++) {
            svgTable.set(i2, svgDoc);
          }
        }
        return svgTable;
      }
      function makeSvgTable(svgTable) {
        const glyphIds = Array.from(svgTable.keys()).sort();
        const documentRecords = [];
        const documentBuffers = [];
        const documentOffsets = /* @__PURE__ */ new Map();
        let nextSvgDocOffset = 0;
        let record = { endGlyphID: null };
        for (let i = 0, l = glyphIds.length; i < l; i++) {
          const glyphId = glyphIds[i];
          const svgDoc = svgTable.get(glyphId);
          let svgDocOffset = documentOffsets.get(svgDoc);
          if (svgDocOffset === void 0) {
            svgDocOffset = nextSvgDocOffset;
            documentBuffers.push(svgDoc);
            documentOffsets.set(svgDoc, svgDocOffset);
            nextSvgDocOffset += svgDoc.byteLength;
          }
          if (glyphId - 1 === record.endGlyphID && svgDocOffset === record.svgDocOffset) {
            record.endGlyphID = glyphId;
          } else {
            record = {
              startGlyphID: glyphId,
              endGlyphID: glyphId,
              svgDocOffset,
              svgDocLength: svgDoc.byteLength
            };
            documentRecords.push(record);
          }
        }
        const numEntries = documentRecords.length;
        const numDocuments = documentBuffers.length;
        const documentsOffset = 2 + numEntries * (2 + 2 + 4 + 4);
        const fields = new Array(3 + 1 + numEntries * 4 + numDocuments);
        let fieldIndex = 0;
        fields[fieldIndex++] = { name: "version", type: "USHORT", value: 0 };
        fields[fieldIndex++] = { name: "svgDocumentListOffset", type: "ULONG", value: 2 + 4 + 4 };
        fields[fieldIndex++] = { name: "reserved", type: "ULONG", value: 0 };
        fields[fieldIndex++] = { name: "numEntries", type: "USHORT", value: numEntries };
        for (let i = 0; i < numEntries; i++) {
          const namePrefix = "documentRecord_" + i;
          const { startGlyphID, endGlyphID, svgDocOffset, svgDocLength } = documentRecords[i];
          fields[fieldIndex++] = { name: namePrefix + "_startGlyphID", type: "USHORT", value: startGlyphID };
          fields[fieldIndex++] = { name: namePrefix + "_endGlyphID", type: "USHORT", value: endGlyphID };
          fields[fieldIndex++] = { name: namePrefix + "_svgDocOffset", type: "ULONG", value: documentsOffset + svgDocOffset };
          fields[fieldIndex++] = { name: namePrefix + "_svgDocLength", type: "ULONG", value: svgDocLength };
        }
        for (let i = 0; i < numDocuments; i++) {
          fields[fieldIndex++] = { name: "svgDoc_" + i, type: "LITERAL", value: documentBuffers[i] };
        }
        return new table_default.Table("SVG ", fields);
      }
      var svg_default = {
        make: makeSvgTable,
        parse: parseSvgTable
      };
      function log2(v) {
        return Math.log(v) / Math.log(2) | 0;
      }
      function computeCheckSum(bytes) {
        while (bytes.length % 4 !== 0) {
          bytes.push(0);
        }
        let sum = 0;
        for (let i = 0; i < bytes.length; i += 4) {
          sum += (bytes[i] << 24) + (bytes[i + 1] << 16) + (bytes[i + 2] << 8) + bytes[i + 3];
        }
        sum %= Math.pow(2, 32);
        return sum;
      }
      function makeTableRecord(tag, checkSum, offset, length) {
        return new table_default.Record("Table Record", [
          { name: "tag", type: "TAG", value: tag !== void 0 ? tag : "" },
          { name: "checkSum", type: "ULONG", value: checkSum !== void 0 ? checkSum : 0 },
          { name: "offset", type: "ULONG", value: offset !== void 0 ? offset : 0 },
          { name: "length", type: "ULONG", value: length !== void 0 ? length : 0 }
        ]);
      }
      function makeSfntTable(tables) {
        const sfnt = new table_default.Table("sfnt", [
          { name: "version", type: "TAG", value: "OTTO" },
          { name: "numTables", type: "USHORT", value: 0 },
          { name: "searchRange", type: "USHORT", value: 0 },
          { name: "entrySelector", type: "USHORT", value: 0 },
          { name: "rangeShift", type: "USHORT", value: 0 }
        ]);
        sfnt.tables = tables;
        sfnt.numTables = tables.length;
        const highestPowerOf2 = Math.pow(2, log2(sfnt.numTables));
        sfnt.searchRange = 16 * highestPowerOf2;
        sfnt.entrySelector = log2(highestPowerOf2);
        sfnt.rangeShift = sfnt.numTables * 16 - sfnt.searchRange;
        const recordFields = [];
        const tableFields = [];
        let offset = sfnt.sizeOf() + makeTableRecord().sizeOf() * sfnt.numTables;
        while (offset % 4 !== 0) {
          offset += 1;
          tableFields.push({ name: "padding", type: "BYTE", value: 0 });
        }
        for (let i = 0; i < tables.length; i += 1) {
          const t = tables[i];
          check_default.argument(t.tableName.length === 4, "Table name" + t.tableName + " is invalid.");
          const tableLength = t.sizeOf();
          const tableRecord = makeTableRecord(t.tableName, computeCheckSum(t.encode()), offset, tableLength);
          recordFields.push({ name: tableRecord.tag + " Table Record", type: "RECORD", value: tableRecord });
          tableFields.push({ name: t.tableName + " table", type: "RECORD", value: t });
          offset += tableLength;
          check_default.argument(!isNaN(offset), "Something went wrong calculating the offset.");
          while (offset % 4 !== 0) {
            offset += 1;
            tableFields.push({ name: "padding", type: "BYTE", value: 0 });
          }
        }
        recordFields.sort(function(r1, r2) {
          if (r1.value.tag > r2.value.tag) {
            return 1;
          } else {
            return -1;
          }
        });
        sfnt.fields = sfnt.fields.concat(recordFields);
        sfnt.fields = sfnt.fields.concat(tableFields);
        return sfnt;
      }
      function metricsForChar(font, chars, notFoundMetrics) {
        for (let i = 0; i < chars.length; i += 1) {
          const glyphIndex = font.charToGlyphIndex(chars[i]);
          if (glyphIndex > 0) {
            const glyph = font.glyphs.get(glyphIndex);
            return glyph.getMetrics();
          }
        }
        return notFoundMetrics;
      }
      function average(vs) {
        let sum = 0;
        for (let i = 0; i < vs.length; i += 1) {
          sum += vs[i];
        }
        return sum / vs.length;
      }
      function fontToSfntTable(font) {
        const xMins = [];
        const yMins = [];
        const xMaxs = [];
        const yMaxs = [];
        const advanceWidths = [];
        const leftSideBearings = [];
        const rightSideBearings = [];
        let firstCharIndex;
        let lastCharIndex = 0;
        let ulUnicodeRange1 = 0;
        let ulUnicodeRange2 = 0;
        let ulUnicodeRange3 = 0;
        let ulUnicodeRange4 = 0;
        for (let i = 0; i < font.glyphs.length; i += 1) {
          const glyph = font.glyphs.get(i);
          const unicode = glyph.unicode | 0;
          if (isNaN(glyph.advanceWidth)) {
            throw new Error("Glyph " + glyph.name + " (" + i + "): advanceWidth is not a number.");
          }
          if (firstCharIndex > unicode || firstCharIndex === void 0) {
            if (unicode > 0) {
              firstCharIndex = unicode;
            }
          }
          if (lastCharIndex < unicode) {
            lastCharIndex = unicode;
          }
          const position = os2_default.getUnicodeRange(unicode);
          if (position < 32) {
            ulUnicodeRange1 |= 1 << position;
          } else if (position < 64) {
            ulUnicodeRange2 |= 1 << position - 32;
          } else if (position < 96) {
            ulUnicodeRange3 |= 1 << position - 64;
          } else if (position < 123) {
            ulUnicodeRange4 |= 1 << position - 96;
          } else {
            throw new Error("Unicode ranges bits > 123 are reserved for internal usage");
          }
          if (glyph.name === ".notdef") continue;
          const metrics = glyph.getMetrics();
          xMins.push(metrics.xMin);
          yMins.push(metrics.yMin);
          xMaxs.push(metrics.xMax);
          yMaxs.push(metrics.yMax);
          leftSideBearings.push(metrics.leftSideBearing);
          rightSideBearings.push(metrics.rightSideBearing);
          advanceWidths.push(glyph.advanceWidth);
        }
        const globals = {
          xMin: Math.min.apply(null, xMins),
          yMin: Math.min.apply(null, yMins),
          xMax: Math.max.apply(null, xMaxs),
          yMax: Math.max.apply(null, yMaxs),
          advanceWidthMax: Math.max.apply(null, advanceWidths),
          advanceWidthAvg: average(advanceWidths),
          minLeftSideBearing: Math.min.apply(null, leftSideBearings),
          maxLeftSideBearing: Math.max.apply(null, leftSideBearings),
          minRightSideBearing: Math.min.apply(null, rightSideBearings)
        };
        globals.ascender = font.ascender;
        globals.descender = font.descender;
        let macStyle = 0;
        if (font.weightClass >= 600) {
          macStyle |= font.macStyleValues.BOLD;
        }
        if (font.italicAngle < 0) {
          macStyle |= font.macStyleValues.ITALIC;
        }
        const headTable = head_default.make({
          flags: 3,
          // 00000011 (baseline for font at y=0; left sidebearing point at x=0)
          unitsPerEm: font.unitsPerEm,
          xMin: globals.xMin,
          yMin: globals.yMin,
          xMax: globals.xMax,
          yMax: globals.yMax,
          lowestRecPPEM: 3,
          macStyle,
          createdTimestamp: font.createdTimestamp
        });
        const hheaTable = hhea_default.make({
          ascender: globals.ascender,
          descender: globals.descender,
          advanceWidthMax: globals.advanceWidthMax,
          minLeftSideBearing: globals.minLeftSideBearing,
          minRightSideBearing: globals.minRightSideBearing,
          xMaxExtent: globals.maxLeftSideBearing + (globals.xMax - globals.xMin),
          numberOfHMetrics: font.glyphs.length
        });
        const maxpTable = maxp_default.make(font.glyphs.length);
        const os2Table = os2_default.make(Object.assign({
          xAvgCharWidth: Math.round(globals.advanceWidthAvg),
          usFirstCharIndex: firstCharIndex,
          usLastCharIndex: lastCharIndex,
          ulUnicodeRange1,
          ulUnicodeRange2,
          ulUnicodeRange3,
          ulUnicodeRange4,
          // See http://typophile.com/node/13081 for more info on vertical metrics.
          // We get metrics for typical characters (such as "x" for xHeight).
          // We provide some fallback characters if characters are unavailable: their
          // ordering was chosen experimentally.
          sTypoAscender: globals.ascender,
          sTypoDescender: globals.descender,
          sTypoLineGap: 0,
          usWinAscent: globals.yMax,
          usWinDescent: Math.abs(globals.yMin),
          ulCodePageRange1: 1,
          // FIXME: hard-code Latin 1 support for now
          sxHeight: metricsForChar(font, "xyvw", { yMax: Math.round(globals.ascender / 2) }).yMax,
          sCapHeight: metricsForChar(font, "HIKLEFJMNTZBDPRAGOQSUVWXY", globals).yMax,
          usDefaultChar: font.hasChar(" ") ? 32 : 0,
          // Use space as the default character, if available.
          usBreakChar: font.hasChar(" ") ? 32 : 0
          // Use space as the break character, if available.
        }, font.tables.os2));
        const hmtxTable = hmtx_default.make(font.glyphs);
        const cmapTable = cmap_default.make(font.glyphs);
        const englishFamilyName = font.getEnglishName("fontFamily");
        const englishStyleName = font.getEnglishName("fontSubfamily");
        const englishFullName = englishFamilyName + " " + englishStyleName;
        let postScriptName = font.getEnglishName("postScriptName");
        if (!postScriptName) {
          postScriptName = englishFamilyName.replace(/\s/g, "") + "-" + englishStyleName;
        }
        const names = {};
        for (let n in font.names) {
          names[n] = font.names[n];
        }
        names.unicode = names.unicode || {};
        names.macintosh = names.macintosh || {};
        names.windows = names.windows || {};
        const fontNamesUnicode = font.names.unicode || {};
        const fontNamesMacintosh = font.names.macintosh || {};
        const fontNamesWindows = font.names.windows || {};
        for (const platform in names) {
          names[platform] = names[platform] || {};
          if (!names[platform].uniqueID) {
            const manufacturer = font.getEnglishName("manufacturer") || "";
            names[platform].uniqueID = { en: `${manufacturer}: ${englishFullName}` };
          }
          if (!names[platform].postScriptName) {
            names[platform].postScriptName = { en: postScriptName };
          }
        }
        if (!names.unicode.preferredFamily) {
          names.unicode.preferredFamily = fontNamesUnicode.fontFamily || fontNamesMacintosh.fontFamily || fontNamesWindows.fontFamily;
        }
        if (!names.macintosh.preferredFamily) {
          names.macintosh.preferredFamily = fontNamesMacintosh.fontFamily || fontNamesUnicode.fontFamily || fontNamesWindows.fontFamily;
        }
        if (!names.windows.preferredFamily) {
          names.windows.preferredFamily = fontNamesWindows.fontFamily || fontNamesUnicode.fontFamily || fontNamesMacintosh.fontFamily;
        }
        if (!names.unicode.preferredSubfamily) {
          names.unicode.preferredSubfamily = fontNamesUnicode.fontSubfamily || fontNamesMacintosh.fontSubfamily || fontNamesWindows.fontSubfamily;
        }
        if (!names.macintosh.preferredSubfamily) {
          names.macintosh.preferredSubfamily = fontNamesMacintosh.fontSubfamily || fontNamesUnicode.fontSubfamily || fontNamesWindows.fontSubfamily;
        }
        if (!names.windows.preferredSubfamily) {
          names.windows.preferredSubfamily = fontNamesWindows.fontSubfamily || fontNamesUnicode.fontSubfamily || fontNamesMacintosh.fontSubfamily;
        }
        const languageTags = [];
        const nameTable = name_default.make(names, languageTags);
        const ltagTable = languageTags.length > 0 ? ltag_default.make(languageTags) : void 0;
        const postTable = post_default.make(font);
        const cffTable = cff_default.make(font.glyphs, {
          version: font.getEnglishName("version"),
          fullName: englishFullName,
          familyName: englishFamilyName,
          weightName: englishStyleName,
          postScriptName,
          unitsPerEm: font.unitsPerEm,
          fontBBox: [0, globals.yMin, globals.ascender, globals.advanceWidthMax],
          topDict: font.tables.cff && font.tables.cff.topDict || {}
        });
        const metaTable = font.metas && Object.keys(font.metas).length > 0 ? meta_default.make(font.metas) : void 0;
        const tables = [headTable, hheaTable, maxpTable, os2Table, nameTable, cmapTable, postTable, cffTable, hmtxTable];
        if (ltagTable) {
          tables.push(ltagTable);
        }
        const optionalTables = {
          gsub: gsub_default,
          cpal: cpal_default,
          colr: colr_default,
          stat: stat_default,
          avar: avar_default,
          cvar: cvar_default,
          fvar: fvar_default,
          gvar: gvar_default,
          gasp: gasp_default,
          svg: svg_default
        };
        const optionalTableArgs = {
          avar: [font.tables.fvar],
          fvar: [font.names]
        };
        for (let tableName in optionalTables) {
          const table = font.tables[tableName];
          if (table) {
            const tableData = optionalTables[tableName].make.call(font, table, ...optionalTableArgs[tableName] || []);
            if (tableData) {
              tables.push(tableData);
            }
          }
        }
        if (metaTable) {
          tables.push(metaTable);
        }
        const sfntTable = makeSfntTable(tables);
        const bytes = sfntTable.encode();
        const checkSum = computeCheckSum(bytes);
        const tableFields = sfntTable.fields;
        let checkSumAdjusted = false;
        for (let i = 0; i < tableFields.length; i += 1) {
          if (tableFields[i].name === "head table") {
            tableFields[i].value.checkSumAdjustment = 2981146554 - checkSum;
            checkSumAdjusted = true;
            break;
          }
        }
        if (!checkSumAdjusted) {
          throw new Error("Could not find head table with checkSum to adjust.");
        }
        return sfntTable;
      }
      var sfnt_default = { make: makeSfntTable, fontToTable: fontToSfntTable, computeCheckSum };
      function searchTag(arr, tag) {
        let imin = 0;
        let imax = arr.length - 1;
        while (imin <= imax) {
          const imid = imin + imax >>> 1;
          const val = arr[imid].tag;
          if (val === tag) {
            return imid;
          } else if (val < tag) {
            imin = imid + 1;
          } else {
            imax = imid - 1;
          }
        }
        return -imin - 1;
      }
      function binSearch(arr, value) {
        let imin = 0;
        let imax = arr.length - 1;
        while (imin <= imax) {
          const imid = imin + imax >>> 1;
          const val = arr[imid];
          if (val === value) {
            return imid;
          } else if (val < value) {
            imin = imid + 1;
          } else {
            imax = imid - 1;
          }
        }
        return -imin - 1;
      }
      function searchRange(ranges, value) {
        let range;
        let imin = 0;
        let imax = ranges.length - 1;
        while (imin <= imax) {
          const imid = imin + imax >>> 1;
          range = ranges[imid];
          const start = range.start;
          if (start === value) {
            return range;
          } else if (start < value) {
            imin = imid + 1;
          } else {
            imax = imid - 1;
          }
        }
        if (imin > 0) {
          range = ranges[imin - 1];
          if (value > range.end) return 0;
          return range;
        }
      }
      function Layout(font, tableName) {
        this.font = font;
        this.tableName = tableName;
      }
      Layout.prototype = {
        /**
         * Binary search an object by "tag" property
         * @instance
         * @function searchTag
         * @memberof opentype.Layout
         * @param  {Array} arr
         * @param  {string} tag
         * @return {number}
         */
        searchTag,
        /**
         * Binary search in a list of numbers
         * @instance
         * @function binSearch
         * @memberof opentype.Layout
         * @param  {Array} arr
         * @param  {number} value
         * @return {number}
         */
        binSearch,
        /**
         * Get or create the Layout table (GSUB, GPOS etc).
         * @param  {boolean} create - Whether to create a new one.
         * @return {Object} The GSUB or GPOS table.
         */
        getTable: function(create) {
          let layout = this.font.tables[this.tableName];
          if (!layout && create) {
            layout = this.font.tables[this.tableName] = this.createDefaultTable();
          }
          return layout;
        },
        /**
         * Returns all scripts in the substitution table.
         * @instance
         * @return {Array}
         */
        getScriptNames: function() {
          let layout = this.getTable();
          if (!layout) {
            return [];
          }
          return layout.scripts.map(function(script) {
            return script.tag;
          });
        },
        /**
         * Returns the best bet for a script name.
         * Returns 'DFLT' if it exists.
         * If not, returns 'latn' if it exists.
         * If neither exist, returns undefined.
         */
        getDefaultScriptName: function() {
          let layout = this.getTable();
          if (!layout) {
            return;
          }
          let hasLatn = false;
          for (let i = 0; i < layout.scripts.length; i++) {
            const name = layout.scripts[i].tag;
            if (name === "DFLT") return name;
            if (name === "latn") hasLatn = true;
          }
          if (hasLatn) return "latn";
        },
        /**
         * Returns all LangSysRecords in the given script.
         * @instance
         * @param {string} [script='DFLT']
         * @param {boolean} create - forces the creation of this script table if it doesn't exist.
         * @return {Object} An object with tag and script properties.
         */
        getScriptTable: function(script, create) {
          const layout = this.getTable(create);
          if (layout) {
            script = script || "DFLT";
            const scripts = layout.scripts;
            const pos = searchTag(layout.scripts, script);
            if (pos >= 0) {
              return scripts[pos].script;
            } else if (create) {
              const scr = {
                tag: script,
                script: {
                  defaultLangSys: { reserved: 0, reqFeatureIndex: 65535, featureIndexes: [] },
                  langSysRecords: []
                }
              };
              scripts.splice(-1 - pos, 0, scr);
              return scr.script;
            }
          }
        },
        /**
         * Returns a language system table
         * @instance
         * @param {string} [script='DFLT']
         * @param {string} [language='dlft']
         * @param {boolean} create - forces the creation of this langSysTable if it doesn't exist.
         * @return {Object}
         */
        getLangSysTable: function(script, language, create) {
          const scriptTable = this.getScriptTable(script, create);
          if (scriptTable) {
            if (!language || language === "dflt" || language === "DFLT") {
              return scriptTable.defaultLangSys;
            }
            const pos = searchTag(scriptTable.langSysRecords, language);
            if (pos >= 0) {
              return scriptTable.langSysRecords[pos].langSys;
            } else if (create) {
              const langSysRecord = {
                tag: language,
                langSys: { reserved: 0, reqFeatureIndex: 65535, featureIndexes: [] }
              };
              scriptTable.langSysRecords.splice(-1 - pos, 0, langSysRecord);
              return langSysRecord.langSys;
            }
          }
        },
        /**
         * Get a specific feature table.
         * @instance
         * @param {string} [script='DFLT']
         * @param {string} [language='dlft']
         * @param {string} feature - One of the codes listed at https://www.microsoft.com/typography/OTSPEC/featurelist.htm
         * @param {boolean} create - forces the creation of the feature table if it doesn't exist.
         * @return {Object}
         */
        getFeatureTable: function(script, language, feature, create) {
          const langSysTable2 = this.getLangSysTable(script, language, create);
          if (langSysTable2) {
            let featureRecord;
            const featIndexes = langSysTable2.featureIndexes;
            const allFeatures = this.font.tables[this.tableName].features;
            for (let i = 0; i < featIndexes.length; i++) {
              featureRecord = allFeatures[featIndexes[i]];
              if (featureRecord.tag === feature) {
                return featureRecord.feature;
              }
            }
            if (create) {
              const index = allFeatures.length;
              check_default.assert(index === 0 || feature >= allFeatures[index - 1].tag, "Features must be added in alphabetical order.");
              featureRecord = {
                tag: feature,
                feature: { params: 0, lookupListIndexes: [] }
              };
              allFeatures.push(featureRecord);
              featIndexes.push(index);
              return featureRecord.feature;
            }
          }
        },
        /**
         * Get the lookup tables of a given type for a script/language/feature.
         * @instance
         * @param {string} [script='DFLT']
         * @param {string} [language='dlft']
         * @param {string} feature - 4-letter feature code
         * @param {number} lookupType - 1 to 9
         * @param {boolean} create - forces the creation of the lookup table if it doesn't exist, with no subtables.
         * @return {Object[]}
         */
        getLookupTables: function(script, language, feature, lookupType, create) {
          const featureTable = this.getFeatureTable(script, language, feature, create);
          const tables = [];
          if (featureTable) {
            let lookupTable;
            const lookupListIndexes = featureTable.lookupListIndexes;
            const allLookups = this.font.tables[this.tableName].lookups;
            for (let i = 0; i < lookupListIndexes.length; i++) {
              lookupTable = allLookups[lookupListIndexes[i]];
              if (lookupTable.lookupType === lookupType) {
                tables.push(lookupTable);
              }
            }
            if (tables.length === 0 && create) {
              lookupTable = {
                lookupType,
                lookupFlag: 0,
                subtables: [],
                markFilteringSet: void 0
              };
              const index = allLookups.length;
              allLookups.push(lookupTable);
              lookupListIndexes.push(index);
              return [lookupTable];
            }
          }
          return tables;
        },
        /**
         * Find a glyph in a class definition table
         * https://docs.microsoft.com/en-us/typography/opentype/spec/chapter2#class-definition-table
         * @param {object} classDefTable - an OpenType Layout class definition table
         * @param {number} glyphIndex - the index of the glyph to find
         * @returns {number} -1 if not found
         */
        getGlyphClass: function(classDefTable, glyphIndex) {
          switch (classDefTable.format) {
            case 1: {
              if (classDefTable.startGlyph <= glyphIndex && glyphIndex < classDefTable.startGlyph + classDefTable.classes.length) {
                return classDefTable.classes[glyphIndex - classDefTable.startGlyph];
              }
              return 0;
            }
            case 2: {
              const range = searchRange(classDefTable.ranges, glyphIndex);
              return range ? range.classId : 0;
            }
          }
        },
        /**
         * Find a glyph in a coverage table
         * https://docs.microsoft.com/en-us/typography/opentype/spec/chapter2#coverage-table
         * @param {object} coverageTable - an OpenType Layout coverage table
         * @param {number} glyphIndex - the index of the glyph to find
         * @returns {number} -1 if not found
         */
        getCoverageIndex: function(coverageTable, glyphIndex) {
          switch (coverageTable.format) {
            case 1: {
              const index = binSearch(coverageTable.glyphs, glyphIndex);
              return index >= 0 ? index : -1;
            }
            case 2: {
              const range = searchRange(coverageTable.ranges, glyphIndex);
              return range ? range.index + glyphIndex - range.start : -1;
            }
          }
        },
        /**
         * Returns the list of glyph indexes of a coverage table.
         * Format 1: the list is stored raw
         * Format 2: compact list as range records.
         * @instance
         * @param  {Object} coverageTable
         * @return {Array}
         */
        expandCoverage: function(coverageTable) {
          if (coverageTable.format === 1) {
            return coverageTable.glyphs;
          } else {
            const glyphs = [];
            const ranges = coverageTable.ranges;
            for (let i = 0; i < ranges.length; i++) {
              const range = ranges[i];
              const start = range.start;
              const end = range.end;
              for (let j = start; j <= end; j++) {
                glyphs.push(j);
              }
            }
            return glyphs;
          }
        }
      };
      var layout_default = Layout;
      function Position(font) {
        layout_default.call(this, font, "gpos");
      }
      Position.prototype = layout_default.prototype;
      Position.prototype.init = function() {
        const script = this.getDefaultScriptName();
        this.defaultKerningTables = this.getKerningTables(script);
      };
      Position.prototype.getKerningValue = function(kerningLookups, leftIndex, rightIndex) {
        for (let i = 0; i < kerningLookups.length; i++) {
          const subtables = kerningLookups[i].subtables;
          for (let j = 0; j < subtables.length; j++) {
            const subtable = subtables[j];
            const covIndex = this.getCoverageIndex(subtable.coverage, leftIndex);
            if (covIndex < 0) continue;
            switch (subtable.posFormat) {
              case 1: {
                let pairSet = subtable.pairSets[covIndex];
                for (let k = 0; k < pairSet.length; k++) {
                  let pair = pairSet[k];
                  if (pair.secondGlyph === rightIndex) {
                    return pair.value1 && pair.value1.xAdvance || 0;
                  }
                }
                break;
              }
              case 2: {
                const class1 = this.getGlyphClass(subtable.classDef1, leftIndex);
                const class2 = this.getGlyphClass(subtable.classDef2, rightIndex);
                const pair = subtable.classRecords[class1][class2];
                return pair.value1 && pair.value1.xAdvance || 0;
              }
            }
          }
        }
        return 0;
      };
      Position.prototype.getKerningTables = function(script, language) {
        if (this.font.tables.gpos) {
          return this.getLookupTables(script, language, "kern", 2);
        }
      };
      var position_default = Position;
      function arraysEqual(ar1, ar2) {
        const n = ar1.length;
        if (n !== ar2.length) {
          return false;
        }
        for (let i = 0; i < n; i++) {
          if (ar1[i] !== ar2[i]) {
            return false;
          }
        }
        return true;
      }
      function binarySearch(array, key, value) {
        let low = 0, high = array.length - 1;
        let result = null;
        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          const record = array[mid];
          const recordValue = record[key];
          if (recordValue < value) {
            low = mid + 1;
          } else if (recordValue > value) {
            high = mid - 1;
          } else {
            result = record;
            break;
          }
        }
        return result;
      }
      function binarySearchIndex(array, key, value) {
        let low = 0, high = array.length - 1;
        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          const element = array[mid];
          if (element[key] < value) {
            low = mid + 1;
          } else if (element[key] > value) {
            high = mid - 1;
          } else {
            return mid;
          }
        }
        return -1;
      }
      function binarySearchInsert(array, key, value) {
        let low = 0, high = array.length;
        const compare = (a, b) => a[key] - b[key];
        while (low < high) {
          const mid = low + high >>> 1;
          if (compare(array[mid], value) < 0) low = mid + 1;
          else high = mid;
        }
        array.splice(low, 0, value);
        return low;
      }
      function isGzip(buf) {
        return buf[0] === 31 && buf[1] === 139 && buf[2] === 8;
      }
      function unGzip(gzip) {
        const data = new DataView(gzip.buffer, gzip.byteOffset, gzip.byteLength);
        let start = 10;
        const end = gzip.byteLength - 8;
        const flg = data.getInt8(3);
        if (flg & 4) {
          start += 2 + data.getUint16(start, true);
        }
        if (flg & 8) {
          while (start < end) if (gzip[start++] === 0) break;
        }
        if (flg & 16) {
          while (start < end) if (gzip[start++] === 0) break;
        }
        if (flg & 2) {
          start += 2;
        }
        if (start >= end) throw new Error("Can't find compressed blocks");
        const isize = data.getUint32(data.byteLength - 4, true);
        return tinf_uncompress(gzip.subarray(start, end), new Uint8Array(isize));
      }
      function copyPoint(p) {
        return {
          x: p.x,
          y: p.y,
          onCurve: p.onCurve,
          lastPointOfContour: p.lastPointOfContour
        };
      }
      function copyComponent(c) {
        return {
          glyphIndex: c.glyphIndex,
          xScale: c.xScale,
          scale01: c.scale01,
          scale10: c.scale10,
          yScale: c.yScale,
          dx: c.dx,
          dy: c.dy
        };
      }
      function Substitution(font) {
        layout_default.call(this, font, "gsub");
      }
      function getSubstFormat(lookupTable, format, defaultSubtable) {
        const subtables = lookupTable.subtables;
        for (let i = 0; i < subtables.length; i++) {
          const subtable = subtables[i];
          if (subtable.substFormat === format) {
            return subtable;
          }
        }
        if (defaultSubtable) {
          subtables.push(defaultSubtable);
          return defaultSubtable;
        }
        return void 0;
      }
      Substitution.prototype = layout_default.prototype;
      Substitution.prototype.createDefaultTable = function() {
        return {
          version: 1,
          scripts: [{
            tag: "DFLT",
            script: {
              defaultLangSys: { reserved: 0, reqFeatureIndex: 65535, featureIndexes: [] },
              langSysRecords: []
            }
          }],
          features: [],
          lookups: []
        };
      };
      Substitution.prototype.getSingle = function(feature, script, language) {
        const substitutions = [];
        const lookupTables = this.getLookupTables(script, language, feature, 1);
        for (let idx = 0; idx < lookupTables.length; idx++) {
          const subtables = lookupTables[idx].subtables;
          for (let i = 0; i < subtables.length; i++) {
            const subtable = subtables[i];
            const glyphs = this.expandCoverage(subtable.coverage);
            let j;
            if (subtable.substFormat === 1) {
              const delta = subtable.deltaGlyphId;
              for (j = 0; j < glyphs.length; j++) {
                const glyph = glyphs[j];
                substitutions.push({ sub: glyph, by: glyph + delta });
              }
            } else {
              const substitute = subtable.substitute;
              for (j = 0; j < glyphs.length; j++) {
                substitutions.push({ sub: glyphs[j], by: substitute[j] });
              }
            }
          }
        }
        return substitutions;
      };
      Substitution.prototype.getMultiple = function(feature, script, language) {
        const substitutions = [];
        const lookupTables = this.getLookupTables(script, language, feature, 2);
        for (let idx = 0; idx < lookupTables.length; idx++) {
          const subtables = lookupTables[idx].subtables;
          for (let i = 0; i < subtables.length; i++) {
            const subtable = subtables[i];
            const glyphs = this.expandCoverage(subtable.coverage);
            let j;
            for (j = 0; j < glyphs.length; j++) {
              const glyph = glyphs[j];
              const replacements = subtable.sequences[j];
              substitutions.push({ sub: glyph, by: replacements });
            }
          }
        }
        return substitutions;
      };
      Substitution.prototype.getAlternates = function(feature, script, language) {
        const alternates = [];
        const lookupTables = this.getLookupTables(script, language, feature, 3);
        for (let idx = 0; idx < lookupTables.length; idx++) {
          const subtables = lookupTables[idx].subtables;
          for (let i = 0; i < subtables.length; i++) {
            const subtable = subtables[i];
            const glyphs = this.expandCoverage(subtable.coverage);
            const alternateSets = subtable.alternateSets;
            for (let j = 0; j < glyphs.length; j++) {
              alternates.push({ sub: glyphs[j], by: alternateSets[j] });
            }
          }
        }
        return alternates;
      };
      Substitution.prototype.getLigatures = function(feature, script, language) {
        const ligatures = [];
        const lookupTables = this.getLookupTables(script, language, feature, 4);
        for (let idx = 0; idx < lookupTables.length; idx++) {
          const subtables = lookupTables[idx].subtables;
          for (let i = 0; i < subtables.length; i++) {
            const subtable = subtables[i];
            const glyphs = this.expandCoverage(subtable.coverage);
            const ligatureSets = subtable.ligatureSets;
            for (let j = 0; j < glyphs.length; j++) {
              const startGlyph = glyphs[j];
              const ligSet = ligatureSets[j];
              for (let k = 0; k < ligSet.length; k++) {
                const lig = ligSet[k];
                ligatures.push({
                  sub: [startGlyph].concat(lig.components),
                  by: lig.ligGlyph
                });
              }
            }
          }
        }
        return ligatures;
      };
      Substitution.prototype.addSingle = function(feature, substitution, script, language) {
        const lookupTable = this.getLookupTables(script, language, feature, 1, true)[0];
        const subtable = getSubstFormat(lookupTable, 2, {
          // lookup type 1 subtable, format 2, coverage format 1
          substFormat: 2,
          coverage: { format: 1, glyphs: [] },
          substitute: []
        });
        check_default.assert(subtable.coverage.format === 1, "Single: unable to modify coverage table format " + subtable.coverage.format);
        const coverageGlyph = substitution.sub;
        let pos = this.binSearch(subtable.coverage.glyphs, coverageGlyph);
        if (pos < 0) {
          pos = -1 - pos;
          subtable.coverage.glyphs.splice(pos, 0, coverageGlyph);
          subtable.substitute.splice(pos, 0, 0);
        }
        subtable.substitute[pos] = substitution.by;
      };
      Substitution.prototype.addMultiple = function(feature, substitution, script, language) {
        check_default.assert(substitution.by instanceof Array && substitution.by.length > 1, 'Multiple: "by" must be an array of two or more ids');
        const lookupTable = this.getLookupTables(script, language, feature, 2, true)[0];
        const subtable = getSubstFormat(lookupTable, 1, {
          // lookup type 2 subtable, format 1, coverage format 1
          substFormat: 1,
          coverage: { format: 1, glyphs: [] },
          sequences: []
        });
        check_default.assert(subtable.coverage.format === 1, "Multiple: unable to modify coverage table format " + subtable.coverage.format);
        const coverageGlyph = substitution.sub;
        let pos = this.binSearch(subtable.coverage.glyphs, coverageGlyph);
        if (pos < 0) {
          pos = -1 - pos;
          subtable.coverage.glyphs.splice(pos, 0, coverageGlyph);
          subtable.sequences.splice(pos, 0, 0);
        }
        subtable.sequences[pos] = substitution.by;
      };
      Substitution.prototype.addAlternate = function(feature, substitution, script, language) {
        const lookupTable = this.getLookupTables(script, language, feature, 3, true)[0];
        const subtable = getSubstFormat(lookupTable, 1, {
          // lookup type 3 subtable, format 1, coverage format 1
          substFormat: 1,
          coverage: { format: 1, glyphs: [] },
          alternateSets: []
        });
        check_default.assert(subtable.coverage.format === 1, "Alternate: unable to modify coverage table format " + subtable.coverage.format);
        const coverageGlyph = substitution.sub;
        let pos = this.binSearch(subtable.coverage.glyphs, coverageGlyph);
        if (pos < 0) {
          pos = -1 - pos;
          subtable.coverage.glyphs.splice(pos, 0, coverageGlyph);
          subtable.alternateSets.splice(pos, 0, 0);
        }
        subtable.alternateSets[pos] = substitution.by;
      };
      Substitution.prototype.addLigature = function(feature, ligature, script, language) {
        const lookupTable = this.getLookupTables(script, language, feature, 4, true)[0];
        let subtable = lookupTable.subtables[0];
        if (!subtable) {
          subtable = {
            // lookup type 4 subtable, format 1, coverage format 1
            substFormat: 1,
            coverage: { format: 1, glyphs: [] },
            ligatureSets: []
          };
          lookupTable.subtables[0] = subtable;
        }
        check_default.assert(subtable.coverage.format === 1, "Ligature: unable to modify coverage table format " + subtable.coverage.format);
        const coverageGlyph = ligature.sub[0];
        const ligComponents = ligature.sub.slice(1);
        const ligatureTable = {
          ligGlyph: ligature.by,
          components: ligComponents
        };
        let pos = this.binSearch(subtable.coverage.glyphs, coverageGlyph);
        if (pos >= 0) {
          const ligatureSet = subtable.ligatureSets[pos];
          for (let i = 0; i < ligatureSet.length; i++) {
            if (arraysEqual(ligatureSet[i].components, ligComponents)) {
              return;
            }
          }
          ligatureSet.push(ligatureTable);
        } else {
          pos = -1 - pos;
          subtable.coverage.glyphs.splice(pos, 0, coverageGlyph);
          subtable.ligatureSets.splice(pos, 0, [ligatureTable]);
        }
      };
      Substitution.prototype.getFeature = function(feature, script, language) {
        if (/ss\d\d/.test(feature)) {
          return this.getSingle(feature, script, language);
        }
        switch (feature) {
          case "aalt":
          case "salt":
            return this.getSingle(feature, script, language).concat(this.getAlternates(feature, script, language));
          case "dlig":
          case "liga":
          case "rlig":
            return this.getLigatures(feature, script, language);
          case "ccmp":
            return this.getMultiple(feature, script, language).concat(this.getLigatures(feature, script, language));
          case "stch":
            return this.getMultiple(feature, script, language);
        }
        return void 0;
      };
      Substitution.prototype.add = function(feature, sub, script, language) {
        if (/ss\d\d/.test(feature)) {
          return this.addSingle(feature, sub, script, language);
        }
        switch (feature) {
          case "aalt":
          case "salt":
            if (typeof sub.by === "number") {
              return this.addSingle(feature, sub, script, language);
            }
            return this.addAlternate(feature, sub, script, language);
          case "dlig":
          case "liga":
          case "rlig":
            return this.addLigature(feature, sub, script, language);
          case "ccmp":
            if (sub.by instanceof Array) {
              return this.addMultiple(feature, sub, script, language);
            }
            return this.addLigature(feature, sub, script, language);
        }
        return void 0;
      };
      var substitution_default = Substitution;
      var PaletteManager = class {
        // private properties don't work with reify
        // @TODO: refactor once we migrated to ES6 modules, see https://github.com/opentypejs/opentype.js/pull/579
        // #font = null;
        /**
         * @type {integer} CPAL color used to (pre)fill unset colors in a palette.
         * Format 0xBBGGRRAA
         */
        // defaultValue = 0x000000FF;
        /**
         * 
         * @param {opentype.Font} font 
         */
        constructor(font) {
          this.defaultValue = 255;
          this.font = font;
        }
        /**
         * Returns the font's cpal table object if present
         * @returns {Object}
         */
        cpal() {
          if (this.font.tables && this.font.tables.cpal) {
            return this.font.tables.cpal;
          }
          return false;
        }
        /**
         * Returns an array of arrays of color values for each palette, optionally in a specified color format
         * @param {string} colorFormat 
         * @returns {Array<Array>}
         */
        getAll(colorFormat) {
          const palettes = [];
          const cpal = this.cpal();
          if (!cpal) return palettes;
          for (let i = 0; i < cpal.colorRecordIndices.length; i++) {
            const startIndex = cpal.colorRecordIndices[i];
            const paletteColors = [];
            for (let j = startIndex; j < startIndex + cpal.numPaletteEntries; j++) {
              paletteColors.push(formatColor(cpal.colorRecords[j], colorFormat || "hexa"));
            }
            palettes.push(paletteColors);
          }
          return palettes;
        }
        /**
         * Converts a color value string or array of color value strings to CPAL integer color value(s)
         * @param {string|Array<string></string>} color 
         * @returns {integer}
         */
        toCPALcolor(color) {
          if (Array.isArray(color)) {
            return color.map((color2) => parseColor(color2, "raw"));
          }
          return parseColor(color, "raw");
        }
        /**
         * Fills a set of palette colors (from palette index, or a provided array of CPAL color values) with a set of colors, falling back to the default color value, until a given count
         * @param {Array<string>|integer} palette Palette index integer or Array of colors to be filled
         * @param {Array<string|integer>} colors Colors to fill the palette with
         * @param {integer} _colorCount Number of colors to fill the palette with, defaults to the value of the numPaletteEntries field. Used internally by extend() and shouldn't be set manually
         * @returns 
         */
        fillPalette(palette, colors = [], _colorCount = this.cpal().numPaletteEntries) {
          palette = Number.isInteger(palette) ? this.get(palette, "raw") : palette;
          return Object.assign(Array(_colorCount).fill(this.defaultValue), this.toCPALcolor(palette).concat(this.toCPALcolor(colors)));
        }
        /**
         * Extend existing palettes and numPaletteEntries by a number of color slots
         * @param {integer} num number of additional color slots to add to all palettes
         */
        extend(num) {
          if (this.ensureCPAL(Array(num).fill(this.defaultValue))) {
            return;
          }
          const cpal = this.cpal();
          const newCount = cpal.numPaletteEntries + num;
          const palettes = this.getAll().map((palette) => this.fillPalette(palette, [], newCount));
          cpal.numPaletteEntries = newCount;
          cpal.colorRecords = this.toCPALcolor(palettes.flat());
          this.updateIndices();
        }
        /**
         * Get a specific palette by its zero-based index
         * @param {integer} paletteIndex 
         * @param {string} [colorFormat='hexa']
         * @returns {Array}
         */
        get(paletteIndex, colorFormat = "hexa") {
          return this.getAll(colorFormat)[paletteIndex] || null;
        }
        /**
         * Get a color from a specific palette by its zero-based index
         * @param {integer} index 
         * @param {integer} paletteIndex
         * @param {string} [colorFormat ='hexa']
         * @returns 
         */
        getColor(index, paletteIndex = 0, colorFormat = "hexa") {
          return getPaletteColor(this.font, index, paletteIndex, colorFormat);
        }
        /**
         * Set one or more colors on a specific palette by its zero-based index
         * @param {integer} index zero-based color index to start filling from
         * @param {string|integer|Array<string|integer>} color color value or array of color values
         * @param {integer} paletteIndex
         * @returns 
         */
        setColor(index, colors, paletteIndex = 0) {
          index = parseInt(index);
          paletteIndex = parseInt(paletteIndex);
          let palettes = this.getAll("raw");
          let palette = palettes[paletteIndex];
          if (!palette) {
            throw Error(`paletteIndex ${paletteIndex} out of range`);
          }
          const cpal = this.cpal();
          const colorCount = cpal.numPaletteEntries;
          if (!Array.isArray(colors)) {
            colors = [colors];
          }
          if (colors.length + index > colorCount) {
            this.extend(colors.length + index - colorCount);
            palettes = this.getAll("raw");
            palette = palettes[paletteIndex];
          }
          for (let i = 0; i < colors.length; i++) {
            palette[i + index] = this.toCPALcolor(colors[i]);
          }
          cpal.colorRecords = palettes.flat();
          this.updateIndices();
        }
        /**
         * Add a new palette. 
         * @param {Array} colors (optional) colors to add to the palette, differences to existing palettes will be filled with the defaultValue.
         * @returns 
         */
        add(colors) {
          if (this.ensureCPAL(colors)) {
            return;
          }
          const cpal = this.cpal();
          const colorCount = cpal.numPaletteEntries;
          if (colors && colors.length) {
            colors = this.toCPALcolor(colors);
            if (colors.length > colorCount) {
              this.extend(colors.length - colorCount);
            } else if (colors.length < colorCount) {
              colors = this.fillPalette(colors);
            }
            cpal.colorRecordIndices.push(cpal.colorRecords.length);
            cpal.colorRecords.push(...colors);
          } else {
            cpal.colorRecordIndices.push(cpal.colorRecords.length);
            cpal.colorRecords.push(...Array(colorCount).fill(this.defaultValue));
          }
        }
        /**
         * deletes a palette by its zero-based index
         * @param {integer} paletteIndex 
         */
        delete(paletteIndex) {
          const palettes = this.getAll("raw");
          delete palettes[paletteIndex];
          const cpal = this.cpal();
          cpal.colorRecordIndices.pop();
          cpal.colorRecords = palettes.flat();
        }
        /**
         * Deletes a specific color index in all palettes and updates all layers using that color with the replacement index
         * @param {integer} colorIndex index of the color that should be deleted
         * @param {integer} replacementIndex index (according to the palette before deletion) of the color to replace in layers using the color to be to deleted
         */
        deleteColor(colorIndex, replacementIndex) {
          if (colorIndex === replacementIndex) {
            throw Error("replacementIndex cannot be the same as colorIndex");
          }
          const cpal = this.cpal();
          const palettes = this.getAll("raw");
          const updatedPalettes = [];
          if (replacementIndex > cpal.numPaletteEntries - 1) {
            throw Error(`Replacement index out of range: numPaletteEntries after deletion: ${cpal.numPaletteEntries - 1}, replacementIndex: ${replacementIndex})`);
          }
          for (let i = 0; i < palettes.length; i++) {
            const palette = palettes[i];
            const updatedPalette = palette.filter((color, index) => index !== colorIndex);
            updatedPalettes.push(updatedPalette);
          }
          const colrTable = this.font.tables.colr;
          if (colrTable) {
            const layerRecords = colrTable.layerRecords;
            for (let i = 0; i < layerRecords.length; i++) {
              const currentIndex = layerRecords[i].paletteIndex;
              if (currentIndex > colorIndex) {
                const shiftAmount = 1;
                layerRecords[i].paletteIndex -= shiftAmount;
              } else if (currentIndex === colorIndex) {
                let replacementShift = 0;
                for (let j = 0; j < palettes.length; j++) {
                  if (replacementIndex > colorIndex && replacementIndex <= colorIndex + palettes[j].length) {
                    replacementShift++;
                    break;
                  }
                }
                layerRecords[i].paletteIndex = replacementIndex - replacementShift;
              }
            }
            this.font.tables.colr = {
              ...colrTable,
              layerRecords
            };
          }
          const flattenedPalettes = updatedPalettes.flat();
          for (let i = 0; i < palettes.length; i++) {
            cpal.colorRecordIndices[i] -= i;
          }
          cpal.numPaletteEntries = Math.max(0, cpal.numPaletteEntries - 1);
          cpal.colorRecords = this.toCPALcolor(flattenedPalettes);
        }
        /**
         * Makes sure that the CPAL table exists and is populated with default values.
         * @param {Array} colors (optional) colors to populate on creation
         * @returns {Boolean} true if it was created, false if it already existed.
         */
        ensureCPAL(colors) {
          if (!this.cpal()) {
            if (!colors || !colors.length) {
              colors = [this.defaultValue];
            } else {
              colors = this.toCPALcolor(colors);
            }
            this.font.tables.cpal = {
              version: 0,
              numPaletteEntries: colors.length,
              colorRecords: colors,
              colorRecordIndices: [0]
            };
            return true;
          }
          return false;
        }
        /**
         * Mainly used internally. Recalculates the colorRecordIndices array based on the numPaletteEntries and number of palettes
         */
        updateIndices() {
          const cpal = this.cpal();
          const paletteCount = Math.ceil(cpal.colorRecords.length / cpal.numPaletteEntries);
          cpal.colorRecordIndices = [];
          for (let i = 0; i < paletteCount; i++) {
            cpal.colorRecordIndices.push(i * cpal.numPaletteEntries);
          }
        }
      };
      var LayerManager = class {
        // private properties don't work with reify
        // @TODO: refactor once we migrated to ES6 modules, see https://github.com/opentypejs/opentype.js/pull/579
        // #font = null;
        constructor(font) {
          this.font = font;
        }
        /**
         * Mainly used internally. Ensures that the COLR table exists and is populated with default values
         * @returns the LayerManager's font instance for chaining
         */
        ensureCOLR() {
          if (!this.font.tables.colr) {
            this.font.tables.colr = {
              version: 0,
              baseGlyphRecords: [],
              layerRecords: []
            };
          }
          return this.font;
        }
        /**
         * Gets the layers for a specific glyph
         * @param {integer} glyphIndex
         * @returns {Array<Object>} array of layer objects {glyph, paletteIndex}
         */
        get(glyphIndex) {
          const font = this.font;
          const layers = [];
          const colr = font.tables.colr;
          const cpal = font.tables.cpal;
          if (!colr || !cpal) {
            return layers;
          }
          const baseGlyph = binarySearch(colr.baseGlyphRecords, "glyphID", glyphIndex);
          if (!baseGlyph) {
            return layers;
          }
          const firstIndex = baseGlyph.firstLayerIndex;
          const numLayers = baseGlyph.numLayers;
          for (let l = 0; l < numLayers; l++) {
            const layer = colr.layerRecords[firstIndex + l];
            layers.push({
              glyph: font.glyphs.get(layer.glyphID),
              paletteIndex: layer.paletteIndex
            });
          }
          return layers;
        }
        /**
         * Adds one or more layers to a glyph, at the end or at a specific position.
         * @param {integer} glyphIndex glyph index to add the layer(s) to.
         * @param {Array|Object} layers layer object {glyph, paletteIndex}/{glyphID, paletteIndex} or array of layer objects.
         * @param {integer?} position position to insert the layers at (will default to adding at the end).
         */
        add(glyphIndex, layers, position) {
          const currentLayers = this.get(glyphIndex);
          layers = Array.isArray(layers) ? layers : [layers];
          if (position === void 0 || position === Infinity || position > currentLayers.length) {
            position = currentLayers.length;
          } else if (position < 0) {
            position = currentLayers.length + 1 + position % (currentLayers.length + 1);
            if (position >= currentLayers.length + 1) {
              position -= currentLayers.length + 1;
            }
          }
          const newLayers = [];
          for (let i = 0; i < position; i++) {
            const glyphID = Number.isInteger(currentLayers[i].glyph) ? currentLayers[i].glyph : currentLayers[i].glyph.index;
            newLayers.push({
              glyphID,
              paletteIndex: currentLayers[i].paletteIndex
            });
          }
          for (const layer of layers) {
            const glyphID = Number.isInteger(layer.glyph) ? layer.glyph : layer.glyph.index;
            newLayers.push({
              glyphID,
              paletteIndex: layer.paletteIndex
            });
          }
          for (let i = position; i < currentLayers.length; i++) {
            const glyphID = Number.isInteger(currentLayers[i].glyph) ? currentLayers[i].glyph : currentLayers[i].glyph.index;
            newLayers.push({
              glyphID,
              paletteIndex: currentLayers[i].paletteIndex
            });
          }
          this.updateColrTable(glyphIndex, newLayers);
        }
        /**
         * Sets a color glyph layer's paletteIndex property to a new index
         * @param {integer} glyphIndex glyph in the font by zero-based glyph index
         * @param {integer} layerIndex layer in the glyph by zero-based layer index
         * @param {integer} paletteIndex new color to set for the layer by zero-based index in any palette
         */
        setPaletteIndex(glyphIndex, layerIndex, paletteIndex) {
          let layers = this.get(glyphIndex);
          if (layers[layerIndex]) {
            layers = layers.map((layer, index) => ({
              glyphID: layer.glyph.index,
              paletteIndex: index === layerIndex ? paletteIndex : layer.paletteIndex
            }));
            this.updateColrTable(glyphIndex, layers);
          } else {
            console.error("Invalid layer index");
          }
        }
        /**
         * Removes one or more layers from a glyph.
         * @param {integer} glyphIndex glyph index to remove the layer(s) from
         * @param {integer} start index to remove the layer at
         * @param {integer?} end (optional) if provided, removes all layers from start index to (and including) end index
         */
        remove(glyphIndex, start, end = start) {
          let currentLayers = this.get(glyphIndex);
          currentLayers = currentLayers.map((layer) => ({
            glyphID: layer.glyph.index,
            paletteIndex: layer.paletteIndex
          }));
          currentLayers.splice(start, end - start + 1);
          this.updateColrTable(glyphIndex, currentLayers);
        }
        /**
         * Mainly used internally. Mainly used internally. Updates the colr table, adding a baseGlyphRecord if needed,
         * ensuring that it's inserted at the correct position, updating numLayers, and adjusting firstLayerIndex values
         * for all baseGlyphRecords according to any deletions or insertions.
         * @param {integer} glyphIndex 
         * @param {Array<Object>} layers array of layer objects {glyphID, paletteIndex}
         */
        updateColrTable(glyphIndex, layers) {
          this.ensureCOLR();
          const font = this.font;
          const colr = font.tables.colr;
          let index = binarySearchIndex(colr.baseGlyphRecords, "glyphID", glyphIndex);
          const addBaseGlyph = index === -1;
          if (addBaseGlyph) {
            const newBaseGlyphRecord = { glyphID: glyphIndex, firstLayerIndex: colr.layerRecords.length, numLayers: 0 };
            index = binarySearchInsert(colr.baseGlyphRecords, "glyphID", newBaseGlyphRecord);
          }
          const baseGlyphRecord = colr.baseGlyphRecords[index];
          const originalNumLayers = baseGlyphRecord.numLayers;
          const newNumLayers = layers.length;
          const layerDiff = newNumLayers - originalNumLayers;
          if (layerDiff > 0) {
            const newLayers = layers.slice(originalNumLayers).map((layer) => ({
              glyphID: layer.glyphID,
              paletteIndex: layer.paletteIndex
            }));
            colr.layerRecords.splice(baseGlyphRecord.firstLayerIndex + originalNumLayers, 0, ...newLayers);
          } else if (layerDiff < 0) {
            colr.layerRecords.splice(baseGlyphRecord.firstLayerIndex + newNumLayers, -layerDiff);
          }
          for (let i = 0; i < Math.min(originalNumLayers, newNumLayers); i++) {
            colr.layerRecords[baseGlyphRecord.firstLayerIndex + i] = {
              glyphID: layers[i].glyphID,
              paletteIndex: layers[i].paletteIndex
            };
          }
          baseGlyphRecord.numLayers = newNumLayers;
          if (layerDiff !== 0) {
            for (let i = 0; i < colr.baseGlyphRecords.length; i++) {
              const sibling = colr.baseGlyphRecords[i];
              if (i === index || sibling.firstLayerIndex < baseGlyphRecord.firstLayerIndex) continue;
              colr.baseGlyphRecords[i].firstLayerIndex += layerDiff;
            }
          }
        }
      };
      var SVGImageManager = class {
        /**
         * @param {opentype.Font} font
         */
        constructor(font) {
          this.font = font;
          this.cache = /* @__PURE__ */ new WeakMap();
        }
        /**
         * @param {number} glyphIndex
         * @returns {SvgImage | undefined}
         */
        get(glyphIndex) {
          const svgImageCacheEntry = this.getOrCreateSvgImageCacheEntry(glyphIndex);
          return svgImageCacheEntry && svgImageCacheEntry.image;
        }
        /**
         * @param {number} glyphIndex
         * @returns {Promise<SvgImage> | undefined}
         */
        getAsync(glyphIndex) {
          const svgImageCacheEntry = this.getOrCreateSvgImageCacheEntry(glyphIndex);
          return svgImageCacheEntry && svgImageCacheEntry.promise;
        }
        /**
         * @param {number} glyphIndex
         * @returns {SVGImageCacheEntry | undefined}
         */
        getOrCreateSvgImageCacheEntry(glyphIndex) {
          const svg = this.font.tables.svg;
          if (svg === void 0) return;
          const svgBuf = svg.get(glyphIndex);
          if (svgBuf === void 0) return;
          let svgDocCacheEntry = this.cache.get(svgBuf);
          if (svgDocCacheEntry === void 0) {
            svgDocCacheEntry = createSvgDocCacheEntry(svgBuf);
            this.cache.set(svgBuf, svgDocCacheEntry);
          }
          let svgImageCacheEntry = svgDocCacheEntry.images.get(glyphIndex);
          if (svgImageCacheEntry === void 0) {
            svgImageCacheEntry = createSvgImageCacheEntry(this.font, svgDocCacheEntry.template, glyphIndex);
            svgImageCacheEntry.promise.then((svgImage) => {
              svgImageCacheEntry.image = svgImage;
              if (typeof this.font.onGlyphUpdated === "function") {
                try {
                  this.font.onGlyphUpdated(glyphIndex);
                } catch (error) {
                  console.error("font.onGlyphUpdated", glyphIndex, error);
                }
              }
            });
            svgDocCacheEntry.images.set(glyphIndex, svgImageCacheEntry);
          }
          return svgImageCacheEntry;
        }
      };
      function createSvgDocCacheEntry(svgBuf) {
        return {
          template: decodeSvgDocument(svgBuf).then(makeSvgTemplate),
          images: /* @__PURE__ */ new Map()
        };
      }
      function createSvgImageCacheEntry(font, svgTemplatePromise, glyphIndex) {
        return {
          promise: svgTemplatePromise.then((svgTemplate) => {
            let svgText;
            if (typeof svgTemplate === "string") {
              svgText = svgTemplate;
            } else {
              svgTemplate[4] = glyphIndex;
              svgText = svgTemplate.join("");
            }
            const svgImage = makeSvgImage(svgText, font.unitsPerEm);
            return svgImage.image.decode().then(() => svgImage);
          }),
          image: void 0
        };
      }
      var decodeSvgDocument = typeof DecompressionStream === "function" ? decodeSvgDocumentWithDecompressionStream : decodeSvgDocumentWithTinyInflate;
      function decodeSvgDocumentWithTinyInflate(buf) {
        try {
          return Promise.resolve(new TextDecoder().decode(isGzip(buf) ? unGzip(buf) : buf));
        } catch (error) {
          return Promise.reject(error);
        }
      }
      function decodeSvgDocumentWithDecompressionStream(buf) {
        if (isGzip(buf)) {
          return new Response(new Response(buf).body.pipeThrough(new DecompressionStream("gzip"))).text();
        }
        try {
          return Promise.resolve(new TextDecoder().decode(buf));
        } catch (error) {
          return Promise.reject(error);
        }
      }
      function makeSvgTemplate(text) {
        const documentStart = text.indexOf("<svg");
        const contentStart = text.indexOf(">", documentStart + 4) + 1;
        if (/ id=['"]glyph\d+['"]/.test(text.substring(documentStart, contentStart))) {
          return text;
        }
        const contentEnd = text.lastIndexOf("</svg>");
        return [
          text.substring(0, contentStart),
          "<defs>",
          text.substring(contentStart, contentEnd),
          '</defs><use href="#glyph',
          "",
          '"/>',
          text.substring(contentEnd)
        ];
      }
      function makeSvgImage(text, unitsPerEm) {
        const svgDocument = new DOMParser().parseFromString(text, "image/svg+xml");
        const svg = svgDocument.documentElement;
        const viewBoxVal = svg.viewBox.baseVal;
        const widthVal = svg.width.baseVal;
        const heightVal = svg.height.baseVal;
        let xScale = 1;
        let yScale = 1;
        if (viewBoxVal.width > 0 && viewBoxVal.height > 0) {
          if (widthVal.unitType === 1) {
            xScale = widthVal.valueInSpecifiedUnits / viewBoxVal.width;
            yScale = heightVal.unitType === 1 ? heightVal.valueInSpecifiedUnits / viewBoxVal.height : xScale;
          } else if (heightVal.unitType === 1) {
            yScale = heightVal.valueInSpecifiedUnits / viewBoxVal.height;
            xScale = yScale;
          } else if (unitsPerEm) {
            xScale = unitsPerEm / viewBoxVal.width;
            yScale = unitsPerEm / viewBoxVal.height;
          }
        }
        const div = document.createElement("div");
        div.style.position = "fixed";
        div.style.visibility = "hidden";
        div.appendChild(svg);
        document.body.appendChild(div);
        const bbox = svg.getBBox();
        document.body.removeChild(div);
        const leftSideBearing = (bbox.x - viewBoxVal.x) * xScale;
        const baseline = (viewBoxVal.y - bbox.y) * yScale;
        const width = bbox.width * xScale;
        const height = bbox.height * yScale;
        svg.setAttribute("viewBox", [bbox.x, bbox.y, bbox.width, bbox.height].join(" "));
        if (xScale !== 1) svg.setAttribute("width", width);
        if (yScale !== 1) svg.setAttribute("height", height);
        const image = new Image(width, height);
        image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.outerHTML);
        return { leftSideBearing, baseline, image };
      }
      var _resolving = /* @__PURE__ */ new WeakMap();
      function parseGlyphCoordinate(p, flag, previousValue, shortVectorBitMask, sameBitMask) {
        let v;
        if ((flag & shortVectorBitMask) > 0) {
          v = p.parseByte();
          if ((flag & sameBitMask) === 0) {
            v = -v;
          }
          v = previousValue + v;
        } else {
          if ((flag & sameBitMask) > 0) {
            v = previousValue;
          } else {
            v = previousValue + p.parseShort();
          }
        }
        return v;
      }
      function parseGlyph(glyph, data, start) {
        const p = new parse_default.Parser(data, start);
        glyph._numberOfContours = p.parseShort();
        glyph._xMin = p.parseShort();
        glyph._yMin = p.parseShort();
        glyph._xMax = p.parseShort();
        glyph._yMax = p.parseShort();
        let flags;
        let flag;
        if (glyph._numberOfContours > 0) {
          const endPointIndices = glyph.endPointIndices = [];
          for (let i = 0; i < glyph._numberOfContours; i += 1) {
            endPointIndices.push(p.parseUShort());
          }
          glyph.instructionLength = p.parseUShort();
          glyph.instructions = [];
          for (let i = 0; i < glyph.instructionLength; i += 1) {
            glyph.instructions.push(p.parseByte());
          }
          const numberOfCoordinates = endPointIndices[endPointIndices.length - 1] + 1;
          flags = [];
          for (let i = 0; i < numberOfCoordinates; i += 1) {
            flag = p.parseByte();
            flags.push(flag);
            if ((flag & 8) > 0) {
              const repeatCount = p.parseByte();
              for (let j = 0; j < repeatCount; j += 1) {
                flags.push(flag);
                i += 1;
              }
            }
          }
          check_default.argument(flags.length === numberOfCoordinates, "Bad flags.");
          if (endPointIndices.length > 0) {
            const points = [];
            let point;
            if (numberOfCoordinates > 0) {
              for (let i = 0; i < numberOfCoordinates; i += 1) {
                flag = flags[i];
                point = {};
                point.onCurve = !!(flag & 1);
                point.lastPointOfContour = endPointIndices.indexOf(i) >= 0;
                points.push(point);
              }
              let px = 0;
              for (let i = 0; i < numberOfCoordinates; i += 1) {
                flag = flags[i];
                point = points[i];
                point.x = parseGlyphCoordinate(p, flag, px, 2, 16);
                px = point.x;
              }
              let py = 0;
              for (let i = 0; i < numberOfCoordinates; i += 1) {
                flag = flags[i];
                point = points[i];
                point.y = parseGlyphCoordinate(p, flag, py, 4, 32);
                py = point.y;
              }
            }
            glyph.points = points;
          } else {
            glyph.points = [];
          }
        } else if (glyph._numberOfContours === 0) {
          glyph.points = [];
        } else {
          glyph.isComposite = true;
          glyph.points = [];
          glyph.components = [];
          let moreComponents = true;
          while (moreComponents) {
            flags = p.parseUShort();
            const component = {
              glyphIndex: p.parseUShort(),
              xScale: 1,
              scale01: 0,
              scale10: 0,
              yScale: 1,
              dx: 0,
              dy: 0
            };
            if ((flags & 1) > 0) {
              if ((flags & 2) > 0) {
                component.dx = p.parseShort();
                component.dy = p.parseShort();
              } else {
                component.matchedPoints = [p.parseUShort(), p.parseUShort()];
              }
            } else {
              if ((flags & 2) > 0) {
                component.dx = p.parseChar();
                component.dy = p.parseChar();
              } else {
                component.matchedPoints = [p.parseByte(), p.parseByte()];
              }
            }
            if ((flags & 8) > 0) {
              component.xScale = component.yScale = p.parseF2Dot14();
            } else if ((flags & 64) > 0) {
              component.xScale = p.parseF2Dot14();
              component.yScale = p.parseF2Dot14();
            } else if ((flags & 128) > 0) {
              component.xScale = p.parseF2Dot14();
              component.scale01 = p.parseF2Dot14();
              component.scale10 = p.parseF2Dot14();
              component.yScale = p.parseF2Dot14();
            }
            glyph.components.push(component);
            moreComponents = !!(flags & 32);
          }
          if (flags & 256) {
            glyph.instructionLength = p.parseUShort();
            glyph.instructions = [];
            for (let i = 0; i < glyph.instructionLength; i += 1) {
              glyph.instructions.push(p.parseByte());
            }
          }
        }
      }
      function transformPoints(points, transform) {
        const newPoints = [];
        for (let i = 0; i < points.length; i += 1) {
          const pt = points[i];
          const newPt = {
            x: transform.xScale * pt.x + transform.scale10 * pt.y + transform.dx,
            y: transform.scale01 * pt.x + transform.yScale * pt.y + transform.dy,
            onCurve: pt.onCurve,
            lastPointOfContour: pt.lastPointOfContour
          };
          newPoints.push(newPt);
        }
        return newPoints;
      }
      function getContours(points) {
        const contours = [];
        let currentContour = [];
        for (let i = 0; i < points.length; i += 1) {
          const pt = points[i];
          currentContour.push(pt);
          if (pt.lastPointOfContour) {
            contours.push(currentContour);
            currentContour = [];
          }
        }
        check_default.argument(currentContour.length === 0, "There are still points left in the current contour.");
        return contours;
      }
      function getPath(points) {
        const p = new path_default();
        if (!points) {
          return p;
        }
        const contours = getContours(points);
        for (let contourIndex = 0; contourIndex < contours.length; ++contourIndex) {
          const contour = contours[contourIndex];
          let curr = contour[contour.length - 1];
          let next = contour[0];
          if (curr.onCurve) {
            p.moveTo(curr.x, curr.y);
          } else {
            if (next.onCurve) {
              p.moveTo(next.x, next.y);
            } else {
              const start = { x: (curr.x + next.x) * 0.5, y: (curr.y + next.y) * 0.5 };
              p.moveTo(start.x, start.y);
            }
          }
          for (let i = 0; i < contour.length; ++i) {
            curr = next;
            next = contour[(i + 1) % contour.length];
            if (curr.onCurve) {
              p.lineTo(curr.x, curr.y);
            } else {
              let next2 = next;
              if (!next.onCurve) {
                next2 = { x: (curr.x + next.x) * 0.5, y: (curr.y + next.y) * 0.5 };
              }
              p.quadraticCurveTo(curr.x, curr.y, next2.x, next2.y);
            }
          }
          p.closePath();
        }
        return p;
      }
      function buildPath(glyphs, glyph) {
        if (glyph.isComposite) {
          if (!_resolving.has(glyphs)) {
            _resolving.set(glyphs, /* @__PURE__ */ new Set());
          }
          const resolving = _resolving.get(glyphs);
          resolving.add(glyph.index);
          try {
            for (let j = 0; j < glyph.components.length; j += 1) {
              const component = glyph.components[j];
              if (resolving.has(component.glyphIndex)) {
                continue;
              }
              const componentGlyph = glyphs.get(component.glyphIndex);
              componentGlyph.getPath();
              if (componentGlyph.points) {
                let transformedPoints;
                if (component.matchedPoints === void 0) {
                  transformedPoints = transformPoints(componentGlyph.points, component);
                } else {
                  if (component.matchedPoints[0] > glyph.points.length - 1 || component.matchedPoints[1] > componentGlyph.points.length - 1) {
                    throw Error("Matched points out of range in " + glyph.name);
                  }
                  const firstPt = glyph.points[component.matchedPoints[0]];
                  let secondPt = componentGlyph.points[component.matchedPoints[1]];
                  const transform = {
                    xScale: component.xScale,
                    scale01: component.scale01,
                    scale10: component.scale10,
                    yScale: component.yScale,
                    dx: 0,
                    dy: 0
                  };
                  secondPt = transformPoints([secondPt], transform)[0];
                  transform.dx = firstPt.x - secondPt.x;
                  transform.dy = firstPt.y - secondPt.y;
                  transformedPoints = transformPoints(componentGlyph.points, transform);
                }
                glyph.points = glyph.points.concat(transformedPoints);
              }
            }
          } finally {
            resolving.delete(glyph.index);
          }
        }
        return getPath(glyph.points);
      }
      function parseGlyfTableAll(data, start, loca, font) {
        const glyphs = new glyphset_default.GlyphSet(font);
        for (let i = 0; i < loca.length - 1; i += 1) {
          const offset = loca[i];
          const nextOffset = loca[i + 1];
          if (offset !== nextOffset) {
            glyphs.push(i, glyphset_default.ttfGlyphLoader(font, i, parseGlyph, data, start + offset, buildPath));
          } else {
            glyphs.push(i, glyphset_default.glyphLoader(font, i));
          }
        }
        return glyphs;
      }
      function parseGlyfTableOnLowMemory(data, start, loca, font) {
        const glyphs = new glyphset_default.GlyphSet(font);
        font._push = function(i) {
          const offset = loca[i];
          const nextOffset = loca[i + 1];
          if (offset !== nextOffset) {
            glyphs.push(i, glyphset_default.ttfGlyphLoader(font, i, parseGlyph, data, start + offset, buildPath));
          } else {
            glyphs.push(i, glyphset_default.glyphLoader(font, i));
          }
        };
        return glyphs;
      }
      function parseGlyfTable(data, start, loca, font, opt) {
        if (opt.lowMemory)
          return parseGlyfTableOnLowMemory(data, start, loca, font);
        else
          return parseGlyfTableAll(data, start, loca, font);
      }
      var glyf_default = { getPath, parse: parseGlyfTable };
      var VariationProcessor = class {
        constructor(font) {
          this.font = font;
        }
        /**
         * Modifies a coords object to make sure that tags have a length of 4
         * @param {Object} coords - variation coordinates
         */
        normalizeCoordTags(coords) {
          for (const tag in coords) {
            if (tag.length < 4) {
              const padded = tag.padEnd(4, " ");
              coords[padded] === void 0 && (coords[padded] = coords[tag]);
              delete coords[tag];
            }
          }
        }
        /**
         * Normalizes the coordinates from the axis ranges to a range of -1 to 1.
         * @param {Object} coords - The coordinates object to normalize.
         * @returns {Array<number>} The normalized coordinates as an array
         */
        getNormalizedCoords(coords) {
          if (!coords) {
            coords = this.font.variation.get();
          }
          let normalized = [];
          this.normalizeCoordTags(coords);
          for (let i = 0; i < this.fvar().axes.length; i++) {
            const axis = this.fvar().axes[i];
            let tagValue = coords[axis.tag];
            if (tagValue === void 0) {
              tagValue = axis.defaultValue;
            }
            if (tagValue < axis.defaultValue) {
              normalized.push((tagValue - axis.defaultValue + Number.EPSILON) / (axis.defaultValue - axis.minValue + Number.EPSILON));
            } else {
              normalized.push((tagValue - axis.defaultValue + Number.EPSILON) / (axis.maxValue - axis.defaultValue + Number.EPSILON));
            }
          }
          if (this.avar()) {
            for (let i = 0; i < this.avar().axisSegmentMaps.length; i++) {
              let segment = this.avar().axisSegmentMaps[i];
              for (let j = 0; j < segment.axisValueMaps.length; j++) {
                let pair = segment.axisValueMaps[j];
                if (j >= 1 && normalized[i] < pair.fromCoordinate) {
                  let prev = segment.axisValueMaps[j - 1];
                  normalized[i] = ((normalized[i] - prev.fromCoordinate) * (pair.toCoordinate - prev.toCoordinate) + Number.EPSILON) / (pair.fromCoordinate - prev.fromCoordinate + Number.EPSILON) + prev.toCoordinate;
                  break;
                }
              }
            }
          }
          return normalized;
        }
        /**
         * Interpolates points within a glyph if deltas are not provided for all points.
         * @param {Array<Object>} points - The points to be interpolated.
         * @param {Array<Object>} glyphPoints - Reference points from the glyph.
         * @param {Object} deltaMap - A map indicating which points have deltas.
         */
        interpolatePoints(points, glyphPoints, deltaMap) {
          if (points.length === 0) {
            return;
          }
          let pointIndex = 0;
          while (pointIndex < points.length) {
            let firstPoint = pointIndex;
            let endPoint = pointIndex;
            let point = points[endPoint];
            while (!point.lastPointOfContour) {
              point = points[++endPoint];
            }
            while (pointIndex <= endPoint && !deltaMap[pointIndex]) {
              pointIndex++;
            }
            if (pointIndex > endPoint) {
              continue;
            }
            let firstDelta = pointIndex;
            let curDelta = pointIndex;
            pointIndex++;
            while (pointIndex <= endPoint) {
              if (deltaMap[pointIndex]) {
                this.deltaInterpolate(curDelta + 1, pointIndex - 1, curDelta, pointIndex, glyphPoints, points);
                curDelta = pointIndex;
              }
              pointIndex++;
            }
            if (curDelta === firstDelta) {
              this.deltaShift(firstPoint, endPoint, curDelta, glyphPoints, points);
            } else {
              this.deltaInterpolate(curDelta + 1, endPoint, curDelta, firstDelta, glyphPoints, points);
              if (firstDelta > 0) {
                this.deltaInterpolate(firstPoint, firstDelta - 1, curDelta, firstDelta, glyphPoints, points);
              }
            }
            pointIndex = endPoint + 1;
          }
        }
        /**
         * Interpolates delta values between two points.
         * @param {number} p1 - Start point index for interpolation.
         * @param {number} p2 - End point index for interpolation.
         * @param {number} ref1 - Reference point index for the start delta.
         * @param {number} ref2 - Reference point index for the end delta.
         * @param {Array<Object>} glyphPoints - Reference points from the glyph.
         * @param {Array<Object>} points - The points to be adjusted.
         */
        deltaInterpolate(p1, p2, ref1, ref2, glyphPoints, points) {
          if (p1 > p2) {
            return;
          }
          let iterable = ["x", "y"];
          for (let i = 0; i < iterable.length; i++) {
            let k = iterable[i];
            if (glyphPoints[ref1][k] > glyphPoints[ref2][k]) {
              var p = ref1;
              ref1 = ref2;
              ref2 = p;
            }
            let in1 = glyphPoints[ref1][k];
            let in2 = glyphPoints[ref2][k];
            let out1 = points[ref1][k];
            let out2 = points[ref2][k];
            if (in1 !== in2 || out1 === out2) {
              let scale = in1 === in2 ? 0 : (out2 - out1) / (in2 - in1);
              for (let p3 = p1; p3 <= p2; p3++) {
                let out3 = glyphPoints[p3][k];
                if (out3 <= in1) {
                  out3 += out1 - in1;
                } else if (out3 >= in2) {
                  out3 += out2 - in2;
                } else {
                  out3 = out1 + (out3 - in1) * scale;
                }
                points[p3][k] = out3;
              }
            }
          }
        }
        /**
         * Applies a delta shift to a range of points based on a reference point.
         * @param {number} p1 - Start point index for shifting.
         * @param {number} p2 - End point index for shifting.
         * @param {number} ref - Reference point index.
         * @param {Array<Object>} glyphPoints - Reference points from the glyph.
         * @param {Array<Object>} points - The points to be shifted.
         */
        deltaShift(p1, p2, ref, glyphPoints, points) {
          let deltaX = points[ref].x - glyphPoints[ref].x;
          let deltaY = points[ref].y - glyphPoints[ref].y;
          if (deltaX === 0 && deltaY === 0) {
            return;
          }
          for (let p = p1; p <= p2; p++) {
            if (p !== ref) {
              points[p].x += deltaX;
              points[p].y += deltaY;
            }
          }
        }
        /**
         * Transforms glyph components based on variation data.
         * @param {Glyph} glyph - The composite glyph to transform.
         * @param {Array<Object>} transformedPoints - Points that are already transformed.
         * @param {Object} coords - Variation coordinates.
         * @param {Array<number>} tuplePoints - Points that are part of the tuple.
         * @param {Object} header - Header information from the variation data.
         * @param {number} factor - The scaling factor for the transformation.
         */
        transformComponents(glyph, transformedPoints, coords, tuplePoints, header, factor) {
          let pointsIndex = 0;
          for (let c = 0; c < glyph.components.length; c++) {
            const component = glyph.components[c];
            const componentGlyph = this.font.glyphs.get(component.glyphIndex);
            const componentTransform = copyComponent(component);
            const deltaIndex = tuplePoints.indexOf(c);
            if (deltaIndex > -1) {
              componentTransform.dx += Math.round(header.deltas[deltaIndex] * factor);
              componentTransform.dy += Math.round(header.deltasY[deltaIndex] * factor);
            }
            const transformedComponentPoints = transformPoints(this.getTransform(componentGlyph, coords).points, componentTransform);
            transformedPoints.splice(pointsIndex, transformedComponentPoints.length, ...transformedComponentPoints);
            pointsIndex += componentGlyph.points.length;
          }
        }
        applyTupleVariationStore(variationData, points, coords, flavor = "gvar", args = {}) {
          if (!coords) {
            coords = this.font.variation.get();
          }
          const normalizedCoords = this.getNormalizedCoords(coords);
          const { headers, sharedPoints } = variationData;
          const axisCount = this.fvar().axes.length;
          let transformedPoints;
          if (flavor === "gvar") {
            transformedPoints = points.map(copyPoint);
          } else if (flavor === "cvar") {
            transformedPoints = [...points];
          }
          for (let h = 0; h < headers.length; h++) {
            const header = headers[h];
            let factor = 1;
            for (let a = 0; a < axisCount; a++) {
              let tupleCoords = [0];
              switch (flavor) {
                case "gvar":
                  tupleCoords = header.peakTuple ? header.peakTuple : this.gvar().sharedTuples[header.sharedTupleRecordsIndex];
                  break;
                case "cvar":
                  tupleCoords = header.peakTuple;
                  break;
              }
              if (tupleCoords[a] === 0) {
                continue;
              }
              if (normalizedCoords[a] === 0) {
                factor = 0;
                break;
              }
              if (!header.intermediateStartTuple) {
                if (normalizedCoords[a] < Math.min(0, tupleCoords[a]) || normalizedCoords[a] > Math.max(0, tupleCoords[a])) {
                  factor = 0;
                  break;
                }
                factor = (factor * normalizedCoords[a] + Number.EPSILON) / (tupleCoords[a] + Number.EPSILON);
              } else {
                if (normalizedCoords[a] < header.intermediateStartTuple[a] || normalizedCoords[a] > header.intermediateEndTuple[a]) {
                  factor = 0;
                  break;
                } else if (normalizedCoords[a] < tupleCoords[a]) {
                  factor = factor * (normalizedCoords[a] - header.intermediateStartTuple[a] + Number.EPSILON) / (tupleCoords[a] - header.intermediateStartTuple[a] + Number.EPSILON);
                } else {
                  factor = factor * (header.intermediateEndTuple[a] - normalizedCoords[a] + Number.EPSILON) / (header.intermediateEndTuple[a] - tupleCoords[a] + Number.EPSILON);
                }
              }
            }
            if (factor === 0) {
              continue;
            }
            const tuplePoints = header.privatePoints.length ? header.privatePoints : sharedPoints;
            if (flavor === "gvar" && args.glyph && args.glyph.isComposite) {
              this.transformComponents(args.glyph, transformedPoints, coords, tuplePoints, header, factor);
            } else if (tuplePoints.length === 0) {
              for (let i = 0; i < transformedPoints.length; i++) {
                const point = transformedPoints[i];
                if (flavor === "gvar") {
                  transformedPoints[i] = {
                    x: Math.round(point.x + header.deltas[i] * factor),
                    y: Math.round(point.y + header.deltasY[i] * factor),
                    onCurve: point.onCurve,
                    lastPointOfContour: point.lastPointOfContour
                  };
                } else if (flavor === "cvar") {
                  transformedPoints[i] = Math.round(point + header.deltas[i] * factor);
                }
              }
            } else {
              let interpolatedPoints;
              if (flavor === "gvar") {
                interpolatedPoints = transformedPoints.map(copyPoint);
              } else if (flavor === "cvar") {
                interpolatedPoints = transformedPoints;
              }
              const deltaMap = Array(points.length).fill(false);
              for (let i = 0; i < tuplePoints.length; i++) {
                let pointIndex = tuplePoints[i];
                if (pointIndex < points.length) {
                  let point = interpolatedPoints[pointIndex];
                  if (flavor === "gvar") {
                    deltaMap[pointIndex] = true;
                    point.x += header.deltas[i] * factor;
                    point.y += header.deltasY[i] * factor;
                  } else if (flavor === "cvar") {
                    transformedPoints[pointIndex] = Math.round(point + header.deltas[i] * factor);
                  }
                }
              }
              if (flavor === "gvar") {
                this.interpolatePoints(interpolatedPoints, transformedPoints, deltaMap);
                for (let i = 0; i < points.length; i++) {
                  let deltaX = interpolatedPoints[i].x - transformedPoints[i].x;
                  let deltaY = interpolatedPoints[i].y - transformedPoints[i].y;
                  transformedPoints[i].x = Math.round(transformedPoints[i].x + deltaX);
                  transformedPoints[i].y = Math.round(transformedPoints[i].y + deltaY);
                }
              }
            }
          }
          return transformedPoints;
        }
        /**
         * Retrieves a transformed copy of a glyph based on the provided variation coordinates, or the glyph itself if no variation was applied
         * @param {opentype.Glyph|number} glyph - Glyph or index of glyph to transform.
         * @param {Object} coords - Variation coords object (will fall back to variation coords in the defaultRenderOptions)
         * @returns {opentype.Glyph} - The transformed glyph.
         */
        getTransform(glyph, coords) {
          if (Number.isInteger(glyph)) {
            glyph = this.font.glyphs.get(glyph);
          }
          const hasBlend = glyph.getBlendPath;
          const hasPoints = !!(glyph.points && glyph.points.length);
          let transformedGlyph = glyph;
          if (hasBlend || hasPoints) {
            if (!coords) {
              coords = this.font.variation.get();
            }
            if (hasPoints) {
              const variationData = this.gvar() && this.gvar().glyphVariations[glyph.index];
              if (variationData) {
                const glyphPoints = glyph.points;
                let transformedPoints = this.applyTupleVariationStore(variationData, glyphPoints, coords, "gvar", { glyph });
                transformedGlyph = new glyph_default(Object.assign({}, glyph, { points: transformedPoints, path: getPath(transformedPoints) }));
              }
            } else if (hasBlend) {
              const blendPath = glyph.getBlendPath(coords);
              transformedGlyph = new glyph_default(Object.assign({}, glyph, { path: blendPath }));
            }
          }
          if (this.font.tables.hvar) {
            glyph._advanceWidth = typeof glyph._advanceWidth !== "undefined" ? glyph._advanceWidth : glyph.advanceWidth;
            glyph.advanceWidth = transformedGlyph.advanceWidth = Math.round(glyph._advanceWidth + this.getVariableAdjustment(transformedGlyph.index, "hvar", "advanceWidth", coords));
            glyph._leftSideBearing = typeof glyph._leftSideBearing !== "undefined" ? glyph._leftSideBearing : glyph.leftSideBearing;
            glyph.leftSideBearing = transformedGlyph.leftSideBearing = Math.round(glyph._leftSideBearing + this.getVariableAdjustment(transformedGlyph.index, "hvar", "lsb", coords));
          }
          return transformedGlyph;
        }
        getCvarTransform(coords) {
          const cvt = this.font.tables.cvt;
          const variationData = this.cvar();
          if (!cvt || !cvt.length || !variationData || !variationData.headers.length) return cvt;
          return this.applyTupleVariationStore(variationData, cvt, coords, "cvar");
        }
        /**
         * Calculates the variable adjustment for a glyph property from variation data.
         * @param {number} gid - Glyph ID.
         * @param {string} tableName - The name of the variation data table.
         * @param {string} parameter - The property to adjust.
         * @param {Object} coords - Variation coordinates.
         * @returns {number} - The calculated adjustment.
         */
        getVariableAdjustment(gid, tableName, parameter, coords) {
          coords = coords || this.font.variation.get();
          let outerIndex, innerIndex;
          const table = this.font.tables[tableName];
          if (!table) {
            throw Error(`trying to get variation adjustment from non-existent table "${table}"`);
          }
          if (!table.itemVariationStore) {
            throw Error(`trying to get variation adjustment from table "${table}" which does not have an itemVariationStore`);
          }
          const mapSize = table[parameter] && table[parameter].map.length;
          if (mapSize) {
            let i = gid;
            if (i >= mapSize) {
              i = mapSize - 1;
            }
            ({ outerIndex, innerIndex } = table[parameter].map[i]);
          } else {
            outerIndex = 0;
            innerIndex = gid;
          }
          return this.getDelta(table.itemVariationStore, outerIndex, innerIndex, coords);
        }
        /**
         * Retrieves the delta value from a variation store.
         * @param {Object} itemStore - The item variation store.
         * @param {number} outerIndex - The outer index in the variation subtables.
         * @param {number} innerIndex - The inner index in the delta sets.
         * @param {Object} coords - Variation coordinates.
         * @returns {number} - The delta value.
         */
        getDelta(itemStore, outerIndex, innerIndex, coords) {
          if (outerIndex >= itemStore.itemVariationSubtables.length) {
            return 0;
          }
          let varData = itemStore.itemVariationSubtables[outerIndex];
          if (innerIndex >= varData.deltaSets.length) {
            return 0;
          }
          let deltaSet = varData.deltaSets[innerIndex];
          let blendVector = this.getBlendVector(itemStore, outerIndex, coords);
          let netAdjustment = 0;
          for (let master = 0; master < varData.regionIndexes.length; master++) {
            netAdjustment += deltaSet[master] * blendVector[master];
          }
          return netAdjustment;
        }
        /**
         * Calculates the blend vector for a set of variation coordinates.
         * @param {Object} itemStore - The item variation store.
         * @param {number} itemIndex - Index of the current item in the variation subtables.
         * @param {Object} coords - Variation coordinates.
         * @returns {Array<number>} - The blend vector for the given coordinates.
         */
        getBlendVector(itemStore, itemIndex, coords) {
          if (!coords) {
            coords = this.font.variation.get();
          }
          let varData = itemStore.itemVariationSubtables[itemIndex];
          const normalizedCoords = this.getNormalizedCoords(coords);
          let blendVector = [];
          for (let master = 0; master < varData.regionIndexes.length; master++) {
            let scalar = 1;
            let regionIndex = varData.regionIndexes[master];
            let axes = itemStore.variationRegions[regionIndex].regionAxes;
            for (let j = 0; j < axes.length; j++) {
              let axis = axes[j];
              let axisScalar;
              if (axis.startCoord > axis.peakCoord || axis.peakCoord > axis.endCoord) {
                axisScalar = 1;
              } else if (axis.startCoord < 0 && axis.endCoord > 0 && axis.peakCoord !== 0) {
                axisScalar = 1;
              } else if (axis.peakCoord === 0) {
                axisScalar = 1;
              } else if (normalizedCoords[j] < axis.startCoord || normalizedCoords[j] > axis.endCoord) {
                axisScalar = 0;
              } else {
                if (normalizedCoords[j] === axis.peakCoord) {
                  axisScalar = 1;
                } else if (normalizedCoords[j] < axis.peakCoord) {
                  axisScalar = (normalizedCoords[j] - axis.startCoord + Number.EPSILON) / (axis.peakCoord - axis.startCoord + Number.EPSILON);
                } else {
                  axisScalar = (axis.endCoord - normalizedCoords[j] + Number.EPSILON) / (axis.endCoord - axis.peakCoord + Number.EPSILON);
                }
              }
              scalar *= axisScalar;
            }
            blendVector[master] = scalar;
          }
          return blendVector;
        }
        /**
         * Helper method that returns the font's avar table if present
         * @returns {Object|undefined}
         */
        avar() {
          return this.font.tables.avar;
        }
        /**
         * Helper method that returns the font's cvar table if present
         * @returns {Object|undefined}
         */
        cvar() {
          return this.font.tables.cvar;
        }
        /**
         * Helper method that returns the font's fvar table if present
         * @returns {Object|undefined}
         */
        fvar() {
          return this.font.tables.fvar;
        }
        /**
         * Helper method that returns the font's gvar table if present
         * @returns {Object|undefined}
         */
        gvar() {
          return this.font.tables.gvar;
        }
        /**
         * Helper method that returns the font's hvar table if present
         * @returns {Object|undefined}
         */
        hvar() {
          return this.font.tables.hvar;
        }
      };
      var VariationManager = class {
        constructor(font) {
          this.font = font;
          this.process = new VariationProcessor(this.font);
          this.activateDefaultVariation();
          this.getTransform = this.process.getTransform.bind(this.process);
        }
        /**
         * Tries to determine the default instance and sets its variation data as the font.defaultRenderOptions.
         * If not defaultInstance can be determined, the default coordinates of all axes are used.
         */
        activateDefaultVariation() {
          const defaultInstance = this.getDefaultInstanceIndex();
          if (defaultInstance > -1) {
            this.set(defaultInstance);
          } else {
            this.set(this.getDefaultCoordinates());
          }
        }
        /**
         * Retrieves the default coordinates for the font's variation axes.
         * @returns {Object} An object mapping axis tags to their default values.
         */
        getDefaultCoordinates() {
          return this.fvar().axes.reduce((acc, axis) => {
            acc[axis.tag] = axis.defaultValue;
            return acc;
          }, {});
        }
        /**
         * Gets the index of the default variation instance or -1 if not able to determine
         * @returns {integer} default index or -1
         */
        getDefaultInstanceIndex() {
          const defaultCoordinates = this.getDefaultCoordinates();
          let defaultInstanceIndex = this.getInstanceIndex(defaultCoordinates);
          if (defaultInstanceIndex < 0) {
            defaultInstanceIndex = this.fvar().instances.findIndex((instance) => instance.name && instance.name.en === "Regular");
          }
          return defaultInstanceIndex;
        }
        /**
         * Retrieves the index of the variation instance matching the coordinates object or -1 if not able to determine
         * @param {integer|Object} coordinates An object where keys are axis tags and values are the corresponding variation values.
         * @returns {integer} The index of the matching instance or -1 if no match is found.
         */
        getInstanceIndex(coordinates) {
          return this.fvar().instances.findIndex(
            (instance) => Object.keys(coordinates).every(
              (axis) => instance.coordinates[axis] === coordinates[axis]
            )
          );
        }
        /**
         * Retrieves a variation instance by its zero-based index
         * @param {integer} index - zero-based index of the variation instance
         * @returns {Object} - variation instance or null if the index is invalid.
         */
        getInstance(index) {
          return this.fvar().instances && this.fvar().instances[index];
        }
        /**
         * Set the variation coordinates to use by default for rendering in the font.defaultRenderOptions
         * @param {integer|Object} instanceIdOrObject Either the zero-based index of a variation instance or an object with axis tags as keys and variation values as values
         */
        set(instanceIdOrObject) {
          let variationData;
          if (Number.isInteger(instanceIdOrObject)) {
            const instance = this.getInstance(instanceIdOrObject);
            if (!instance) {
              throw Error(`Invalid instance index ${instanceIdOrObject}`);
            }
            variationData = { ...instance.coordinates };
          } else {
            variationData = instanceIdOrObject;
            this.process.normalizeCoordTags(variationData);
          }
          variationData = Object.assign(
            {},
            this.font.defaultRenderOptions.variation,
            variationData
          );
          this.font.defaultRenderOptions = Object.assign(
            {},
            this.font.defaultRenderOptions,
            { variation: variationData }
          );
        }
        /**
         * Returns the variation coordinates currently set in the font.defaultRenderOptions
         * @returns {Object}
         */
        get() {
          return Object.assign({}, this.font.defaultRenderOptions.variation);
        }
        /**
         * Helper method that returns the font's avar table if present
         * @returns {Object|undefined}
         */
        avar() {
          return this.font.tables.avar;
        }
        /**
         * Helper method that returns the font's cvar table if present
         * @returns {Object|undefined}
         */
        cvar() {
          return this.font.tables.cvar;
        }
        /**
         * Helper method that returns the font's fvar table if present
         * @returns {Object|undefined}
         */
        fvar() {
          return this.font.tables.fvar;
        }
        /**
         * Helper method that returns the font's gvar table if present
         * @returns {Object|undefined}
         */
        gvar() {
          return this.font.tables.gvar;
        }
        /**
         * Helper method that returns the font's hvar table if present
         * @returns {Object|undefined}
         */
        hvar() {
          return this.font.tables.hvar;
        }
      };
      var MAX_INSTRUCTIONS = 1e6;
      var MAX_CALL_DEPTH2 = 64;
      var MAX_LOOP_COUNT = 1e4;
      var instructionTable;
      var exec;
      var execGlyph;
      var execComponent;
      function Hinting(font) {
        this.font = font;
        this.getCommands = function(hPoints) {
          return glyf_default.getPath(hPoints).commands;
        };
        this._fpgmState = this._prepState = void 0;
        this._errorState = 0;
      }
      function roundOff(v) {
        return v;
      }
      function roundToGrid(v) {
        return Math.sign(v) * Math.round(Math.abs(v));
      }
      function roundToDoubleGrid(v) {
        return Math.sign(v) * Math.round(Math.abs(v * 2)) / 2;
      }
      function roundToHalfGrid(v) {
        return Math.sign(v) * (Math.round(Math.abs(v) + 0.5) - 0.5);
      }
      function roundUpToGrid(v) {
        return Math.sign(v) * Math.ceil(Math.abs(v));
      }
      function roundDownToGrid(v) {
        return Math.sign(v) * Math.floor(Math.abs(v));
      }
      var roundSuper = function(v) {
        const period = this.srPeriod;
        let phase = this.srPhase;
        const threshold = this.srThreshold;
        let sign = 1;
        if (v < 0) {
          v = -v;
          sign = -1;
        }
        v += threshold - phase;
        v = Math.trunc(v / period) * period;
        v += phase;
        if (v < 0) return phase * sign;
        return v * sign;
      };
      var xUnitVector = {
        x: 1,
        y: 0,
        axis: "x",
        // Gets the projected distance between two points.
        // o1/o2 ... if true, respective original position is used.
        distance: function(p1, p2, o1, o2) {
          return (o1 ? p1.xo : p1.x) - (o2 ? p2.xo : p2.x);
        },
        // Moves point p so the moved position has the same relative
        // position to the moved positions of rp1 and rp2 than the
        // original positions had.
        //
        // See APPENDIX on INTERPOLATE at the bottom of this file.
        interpolate: function(p, rp1, rp2, pv) {
          let do1;
          let do2;
          let doa1;
          let doa2;
          let dm1;
          let dm2;
          let dt;
          if (!pv || pv === this) {
            do1 = p.xo - rp1.xo;
            do2 = p.xo - rp2.xo;
            dm1 = rp1.x - rp1.xo;
            dm2 = rp2.x - rp2.xo;
            doa1 = Math.abs(do1);
            doa2 = Math.abs(do2);
            dt = doa1 + doa2;
            if (dt === 0) {
              p.x = p.xo + (dm1 + dm2) / 2;
              return;
            }
            p.x = p.xo + (dm1 * doa2 + dm2 * doa1) / dt;
            return;
          }
          do1 = pv.distance(p, rp1, true, true);
          do2 = pv.distance(p, rp2, true, true);
          dm1 = pv.distance(rp1, rp1, false, true);
          dm2 = pv.distance(rp2, rp2, false, true);
          doa1 = Math.abs(do1);
          doa2 = Math.abs(do2);
          dt = doa1 + doa2;
          if (dt === 0) {
            xUnitVector.setRelative(p, p, (dm1 + dm2) / 2, pv, true);
            return;
          }
          xUnitVector.setRelative(p, p, (dm1 * doa2 + dm2 * doa1) / dt, pv, true);
        },
        // Slope of line normal to this
        normalSlope: Number.NEGATIVE_INFINITY,
        // Sets the point 'p' relative to point 'rp'
        // by the distance 'd'.
        //
        // See APPENDIX on SETRELATIVE at the bottom of this file.
        //
        // p   ... point to set
        // rp  ... reference point
        // d   ... distance on projection vector
        // pv  ... projection vector (undefined = this)
        // org ... if true, uses the original position of rp as reference.
        setRelative: function(p, rp, d, pv, org) {
          if (!pv || pv === this) {
            p.x = (org ? rp.xo : rp.x) + d;
            return;
          }
          const rpx = org ? rp.xo : rp.x;
          const rpy = org ? rp.yo : rp.y;
          const rpdx = rpx + d * pv.x;
          const rpdy = rpy + d * pv.y;
          p.x = rpdx + (p.y - rpdy) / pv.normalSlope;
        },
        // Slope of vector line.
        slope: 0,
        // Touches the point p.
        touch: function(p) {
          p.xTouched = true;
        },
        // Tests if a point p is touched.
        touched: function(p) {
          return p.xTouched;
        },
        // Untouches the point p.
        untouch: function(p) {
          p.xTouched = false;
        }
      };
      var yUnitVector = {
        x: 0,
        y: 1,
        axis: "y",
        // Gets the projected distance between two points.
        // o1/o2 ... if true, respective original position is used.
        distance: function(p1, p2, o1, o2) {
          return (o1 ? p1.yo : p1.y) - (o2 ? p2.yo : p2.y);
        },
        // Moves point p so the moved position has the same relative
        // position to the moved positions of rp1 and rp2 than the
        // original positions had.
        //
        // See APPENDIX on INTERPOLATE at the bottom of this file.
        interpolate: function(p, rp1, rp2, pv) {
          let do1;
          let do2;
          let doa1;
          let doa2;
          let dm1;
          let dm2;
          let dt;
          if (!pv || pv === this) {
            do1 = p.yo - rp1.yo;
            do2 = p.yo - rp2.yo;
            dm1 = rp1.y - rp1.yo;
            dm2 = rp2.y - rp2.yo;
            doa1 = Math.abs(do1);
            doa2 = Math.abs(do2);
            dt = doa1 + doa2;
            if (dt === 0) {
              p.y = p.yo + (dm1 + dm2) / 2;
              return;
            }
            p.y = p.yo + (dm1 * doa2 + dm2 * doa1) / dt;
            return;
          }
          do1 = pv.distance(p, rp1, true, true);
          do2 = pv.distance(p, rp2, true, true);
          dm1 = pv.distance(rp1, rp1, false, true);
          dm2 = pv.distance(rp2, rp2, false, true);
          doa1 = Math.abs(do1);
          doa2 = Math.abs(do2);
          dt = doa1 + doa2;
          if (dt === 0) {
            yUnitVector.setRelative(p, p, (dm1 + dm2) / 2, pv, true);
            return;
          }
          yUnitVector.setRelative(p, p, (dm1 * doa2 + dm2 * doa1) / dt, pv, true);
        },
        // Slope of line normal to this.
        normalSlope: 0,
        // Sets the point 'p' relative to point 'rp'
        // by the distance 'd'
        //
        // See APPENDIX on SETRELATIVE at the bottom of this file.
        //
        // p   ... point to set
        // rp  ... reference point
        // d   ... distance on projection vector
        // pv  ... projection vector (undefined = this)
        // org ... if true, uses the original position of rp as reference.
        setRelative: function(p, rp, d, pv, org) {
          if (!pv || pv === this) {
            p.y = (org ? rp.yo : rp.y) + d;
            return;
          }
          const rpx = org ? rp.xo : rp.x;
          const rpy = org ? rp.yo : rp.y;
          const rpdx = rpx + d * pv.x;
          const rpdy = rpy + d * pv.y;
          p.y = rpdy + pv.normalSlope * (p.x - rpdx);
        },
        // Slope of vector line.
        slope: Number.POSITIVE_INFINITY,
        // Touches the point p.
        touch: function(p) {
          p.yTouched = true;
        },
        // Tests if a point p is touched.
        touched: function(p) {
          return p.yTouched;
        },
        // Untouches the point p.
        untouch: function(p) {
          p.yTouched = false;
        }
      };
      Object.freeze(xUnitVector);
      Object.freeze(yUnitVector);
      function UnitVector(x, y) {
        this.x = x;
        this.y = y;
        this.axis = void 0;
        this.slope = y / x;
        this.normalSlope = -x / y;
        Object.freeze(this);
      }
      UnitVector.prototype.distance = function(p1, p2, o1, o2) {
        return this.x * xUnitVector.distance(p1, p2, o1, o2) + this.y * yUnitVector.distance(p1, p2, o1, o2);
      };
      UnitVector.prototype.interpolate = function(p, rp1, rp2, pv) {
        let dm1;
        let dm2;
        let do1;
        let do2;
        let doa1;
        let doa2;
        let dt;
        do1 = pv.distance(p, rp1, true, true);
        do2 = pv.distance(p, rp2, true, true);
        dm1 = pv.distance(rp1, rp1, false, true);
        dm2 = pv.distance(rp2, rp2, false, true);
        doa1 = Math.abs(do1);
        doa2 = Math.abs(do2);
        dt = doa1 + doa2;
        if (dt === 0) {
          this.setRelative(p, p, (dm1 + dm2) / 2, pv, true);
          return;
        }
        this.setRelative(p, p, (dm1 * doa2 + dm2 * doa1) / dt, pv, true);
      };
      UnitVector.prototype.setRelative = function(p, rp, d, pv, org) {
        pv = pv || this;
        const rpx = org ? rp.xo : rp.x;
        const rpy = org ? rp.yo : rp.y;
        const rpdx = rpx + d * pv.x;
        const rpdy = rpy + d * pv.y;
        const pvns = pv.normalSlope;
        const fvs = this.slope;
        const px = p.x;
        const py = p.y;
        p.x = (fvs * px - pvns * rpdx + rpdy - py) / (fvs - pvns);
        p.y = fvs * (p.x - px) + py;
      };
      UnitVector.prototype.touch = function(p) {
        p.xTouched = true;
        p.yTouched = true;
      };
      function getUnitVector(x, y) {
        const d = Math.sqrt(x * x + y * y);
        x /= d;
        y /= d;
        if (x === 1 && y === 0) return xUnitVector;
        else if (x === 0 && y === 1) return yUnitVector;
        else return new UnitVector(x, y);
      }
      function HPoint(x, y, lastPointOfContour, onCurve) {
        this.x = this.xo = Math.round(x * 64) / 64;
        this.y = this.yo = Math.round(y * 64) / 64;
        this.lastPointOfContour = lastPointOfContour;
        this.onCurve = onCurve;
        this.prevPointOnContour = void 0;
        this.nextPointOnContour = void 0;
        this.xTouched = false;
        this.yTouched = false;
        Object.preventExtensions(this);
      }
      HPoint.prototype.nextTouched = function(v) {
        let p = this.nextPointOnContour;
        while (!v.touched(p) && p !== this) p = p.nextPointOnContour;
        return p;
      };
      HPoint.prototype.prevTouched = function(v) {
        let p = this.prevPointOnContour;
        while (!v.touched(p) && p !== this) p = p.prevPointOnContour;
        return p;
      };
      var HPZero = Object.freeze(new HPoint(0, 0));
      var defaultState = {
        cvCutIn: 17 / 16,
        // control value cut in
        deltaBase: 9,
        deltaShift: 0.125,
        loop: 1,
        // loops some instructions
        minDis: 1,
        // minimum distance
        autoFlip: true
      };
      function State(env, prog) {
        this.env = env;
        this.stack = [];
        this.prog = prog;
        switch (env) {
          case "glyf":
            this.zp0 = this.zp1 = this.zp2 = 1;
            this.rp0 = this.rp1 = this.rp2 = 0;
          /* fall through */
          case "prep":
            this.fv = this.pv = this.dpv = xUnitVector;
            this.round = roundToGrid;
        }
      }
      Hinting.prototype.exec = function(glyph, ppem) {
        if (typeof ppem !== "number") {
          throw new Error("Point size is not a number!");
        }
        if (this._errorState > 2) return;
        const font = this.font;
        let prepState = this._prepState;
        if (!prepState || prepState.ppem !== ppem) {
          let fpgmState = this._fpgmState;
          if (!fpgmState) {
            State.prototype = defaultState;
            fpgmState = this._fpgmState = new State("fpgm", font.tables.fpgm);
            fpgmState.funcs = [];
            fpgmState.font = font;
            fpgmState.instructionCount = 0;
            fpgmState.callDepth = 0;
            if (false) {
              console.log("---EXEC FPGM---");
              fpgmState.step = -1;
            }
            try {
              exec(fpgmState);
            } catch (e) {
              console.log("Hinting error in FPGM:" + e);
              this._errorState = 3;
              return;
            }
          }
          State.prototype = fpgmState;
          prepState = this._prepState = new State("prep", font.tables.prep);
          prepState.ppem = ppem;
          prepState.instructionCount = 0;
          prepState.callDepth = 0;
          const oCvt = font.variation && font.variation.process.getCvarTransform() || font.tables.cvt;
          if (oCvt) {
            const cvt = prepState.cvt = new Array(oCvt.length);
            const scale = ppem / font.unitsPerEm;
            for (let c = 0; c < oCvt.length; c++) {
              cvt[c] = oCvt[c] * scale;
            }
          } else {
            prepState.cvt = [];
          }
          if (false) {
            console.log("---EXEC PREP---");
            prepState.step = -1;
          }
          try {
            exec(prepState);
          } catch (e) {
            if (this._errorState < 2) {
              console.log("Hinting error in PREP:" + e);
            }
            this._errorState = 2;
          }
        }
        if (this._errorState > 1) return;
        try {
          return execGlyph(glyph, prepState);
        } catch (e) {
          if (this._errorState < 1) {
            console.log("Hinting error:" + e);
            console.log("Note: further hinting errors are silenced");
          }
          this._errorState = 1;
          return void 0;
        }
      };
      execGlyph = function(glyph, prepState) {
        const xScale = prepState.ppem / prepState.font.unitsPerEm;
        const yScale = xScale;
        let components = glyph.components;
        let contours;
        let gZone;
        let state;
        State.prototype = prepState;
        if (!components) {
          state = new State("glyf", glyph.instructions);
          state.instructionCount = 0;
          state.callDepth = 0;
          if (false) {
            console.log("---EXEC GLYPH---");
            state.step = -1;
          }
          execComponent(glyph, state, xScale, yScale);
          gZone = state.gZone;
        } else {
          const font = prepState.font;
          gZone = [];
          contours = [];
          for (let i = 0; i < components.length; i++) {
            const c = components[i];
            const cg = font.glyphs.get(c.glyphIndex);
            state = new State("glyf", cg.instructions);
            state.instructionCount = 0;
            state.callDepth = 0;
            if (false) {
              console.log("---EXEC COMP " + i + "---");
              state.step = -1;
            }
            execComponent(cg, state, xScale, yScale);
            const dx = Math.round(c.dx * xScale);
            const dy = Math.round(c.dy * yScale);
            const gz = state.gZone;
            const cc = state.contours;
            for (let pi = 0; pi < gz.length; pi++) {
              const p = gz[pi];
              p.xTouched = p.yTouched = false;
              p.xo = p.x = p.x + dx;
              p.yo = p.y = p.y + dy;
            }
            const gLen = gZone.length;
            gZone.push.apply(gZone, gz);
            for (let j = 0; j < cc.length; j++) {
              contours.push(cc[j] + gLen);
            }
          }
          if (glyph.instructions && !state.inhibitGridFit) {
            state = new State("glyf", glyph.instructions);
            state.gZone = state.z0 = state.z1 = state.z2 = gZone;
            state.contours = contours;
            gZone.push(
              new HPoint(0, 0),
              new HPoint(Math.round(glyph.advanceWidth * xScale), 0)
            );
            if (false) {
              console.log("---EXEC COMPOSITE---");
              state.step = -1;
            }
            exec(state);
            gZone.length -= 2;
          }
        }
        return gZone;
      };
      execComponent = function(glyph, state, xScale, yScale) {
        const points = glyph.points || [];
        const pLen = points.length;
        const gZone = state.gZone = state.z0 = state.z1 = state.z2 = [];
        const contours = state.contours = [];
        let cp;
        for (let i = 0; i < pLen; i++) {
          cp = points[i];
          gZone[i] = new HPoint(
            cp.x * xScale,
            cp.y * yScale,
            cp.lastPointOfContour,
            cp.onCurve
          );
        }
        let sp;
        let np;
        for (let i = 0; i < pLen; i++) {
          cp = gZone[i];
          if (!sp) {
            sp = cp;
            contours.push(i);
          }
          if (cp.lastPointOfContour) {
            cp.nextPointOnContour = sp;
            sp.prevPointOnContour = cp;
            sp = void 0;
          } else {
            np = gZone[i + 1];
            cp.nextPointOnContour = np;
            np.prevPointOnContour = cp;
          }
        }
        if (state.inhibitGridFit) return;
        if (false) {
          console.log("PROCESSING GLYPH", state.stack);
          for (let i = 0; i < pLen; i++) {
            console.log(i, gZone[i].x, gZone[i].y);
          }
        }
        gZone.push(
          new HPoint(0, 0),
          new HPoint(Math.round(glyph.advanceWidth * xScale), 0)
        );
        exec(state);
        gZone.length -= 2;
        if (false) {
          console.log("FINISHED GLYPH", state.stack);
          for (let i = 0; i < pLen; i++) {
            console.log(i, gZone[i].x, gZone[i].y);
          }
        }
      };
      exec = function(state) {
        let prog = state.prog;
        if (!prog) return;
        const pLen = prog.length;
        let ins;
        for (state.ip = 0; state.ip < pLen; state.ip++) {
          if (++state.instructionCount > MAX_INSTRUCTIONS) {
            throw new Error(
              "Hinting instructions exceeded maximum of " + MAX_INSTRUCTIONS
            );
          }
          if (false) state.step++;
          ins = instructionTable[prog[state.ip]];
          if (!ins) {
            throw new Error(
              "unknown instruction: 0x" + Number(prog[state.ip]).toString(16)
            );
          }
          ins(state);
        }
      };
      function initTZone(state) {
        const tZone = state.tZone = new Array(state.gZone.length);
        for (let i = 0; i < tZone.length; i++) {
          tZone[i] = new HPoint(0, 0);
        }
      }
      function skip(state, handleElse) {
        const prog = state.prog;
        let ip = state.ip;
        let nesting = 1;
        let ins;
        do {
          ins = prog[++ip];
          if (ins === 88)
            nesting++;
          else if (ins === 89)
            nesting--;
          else if (ins === 64)
            ip += prog[ip + 1] + 1;
          else if (ins === 65)
            ip += 2 * prog[ip + 1] + 1;
          else if (ins >= 176 && ins <= 183)
            ip += ins - 176 + 1;
          else if (ins >= 184 && ins <= 191)
            ip += (ins - 184 + 1) * 2;
          else if (handleElse && nesting === 1 && ins === 27)
            break;
        } while (nesting > 0);
        state.ip = ip;
      }
      function SVTCA(v, state) {
        if (false) console.log(state.step, "SVTCA[" + v.axis + "]");
        state.fv = state.pv = state.dpv = v;
      }
      function SPVTCA(v, state) {
        if (false) console.log(state.step, "SPVTCA[" + v.axis + "]");
        state.pv = state.dpv = v;
      }
      function SFVTCA(v, state) {
        if (false) console.log(state.step, "SFVTCA[" + v.axis + "]");
        state.fv = v;
      }
      function SPVTL(a, state) {
        const stack = state.stack;
        const p2i = stack.pop();
        const p1i = stack.pop();
        const p2 = state.z2[p2i];
        const p1 = state.z1[p1i];
        if (false) console.log("SPVTL[" + a + "]", p2i, p1i);
        let dx;
        let dy;
        if (!a) {
          dx = p1.x - p2.x;
          dy = p1.y - p2.y;
        } else {
          dx = p2.y - p1.y;
          dy = p1.x - p2.x;
        }
        state.pv = state.dpv = getUnitVector(dx, dy);
      }
      function SFVTL(a, state) {
        const stack = state.stack;
        const p2i = stack.pop();
        const p1i = stack.pop();
        const p2 = state.z2[p2i];
        const p1 = state.z1[p1i];
        if (false) console.log("SFVTL[" + a + "]", p2i, p1i);
        let dx;
        let dy;
        if (!a) {
          dx = p1.x - p2.x;
          dy = p1.y - p2.y;
        } else {
          dx = p2.y - p1.y;
          dy = p1.x - p2.x;
        }
        state.fv = getUnitVector(dx, dy);
      }
      function SPVFS(state) {
        const stack = state.stack;
        const y = stack.pop();
        const x = stack.pop();
        if (false) console.log(state.step, "SPVFS[]", y, x);
        state.pv = state.dpv = getUnitVector(x, y);
      }
      function SFVFS(state) {
        const stack = state.stack;
        const y = stack.pop();
        const x = stack.pop();
        if (false) console.log(state.step, "SPVFS[]", y, x);
        state.fv = getUnitVector(x, y);
      }
      function GPV(state) {
        const stack = state.stack;
        const pv = state.pv;
        if (false) console.log(state.step, "GPV[]");
        stack.push(pv.x * 16384);
        stack.push(pv.y * 16384);
      }
      function GFV(state) {
        const stack = state.stack;
        const fv = state.fv;
        if (false) console.log(state.step, "GFV[]");
        stack.push(fv.x * 16384);
        stack.push(fv.y * 16384);
      }
      function SFVTPV(state) {
        state.fv = state.pv;
        if (false) console.log(state.step, "SFVTPV[]");
      }
      function ISECT(state) {
        const stack = state.stack;
        const pa0i = stack.pop();
        const pa1i = stack.pop();
        const pb0i = stack.pop();
        const pb1i = stack.pop();
        const pi = stack.pop();
        const z0 = state.z0;
        const z1 = state.z1;
        const pa0 = z0[pa0i];
        const pa1 = z0[pa1i];
        const pb0 = z1[pb0i];
        const pb1 = z1[pb1i];
        const p = state.z2[pi];
        if (false) console.log("ISECT[], ", pa0i, pa1i, pb0i, pb1i, pi);
        const x1 = pa0.x;
        const y1 = pa0.y;
        const x2 = pa1.x;
        const y2 = pa1.y;
        const x3 = pb0.x;
        const y3 = pb0.y;
        const x4 = pb1.x;
        const y4 = pb1.y;
        const div = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        const f1 = x1 * y2 - y1 * x2;
        const f2 = x3 * y4 - y3 * x4;
        p.x = (f1 * (x3 - x4) - f2 * (x1 - x2)) / div;
        p.y = (f1 * (y3 - y4) - f2 * (y1 - y2)) / div;
      }
      function SRP0(state) {
        state.rp0 = state.stack.pop();
        if (false) console.log(state.step, "SRP0[]", state.rp0);
      }
      function SRP1(state) {
        state.rp1 = state.stack.pop();
        if (false) console.log(state.step, "SRP1[]", state.rp1);
      }
      function SRP2(state) {
        state.rp2 = state.stack.pop();
        if (false) console.log(state.step, "SRP2[]", state.rp2);
      }
      function SZP0(state) {
        const n = state.stack.pop();
        if (false) console.log(state.step, "SZP0[]", n);
        state.zp0 = n;
        switch (n) {
          case 0:
            if (!state.tZone) initTZone(state);
            state.z0 = state.tZone;
            break;
          case 1:
            state.z0 = state.gZone;
            break;
          default:
            throw new Error("Invalid zone pointer");
        }
      }
      function SZP1(state) {
        const n = state.stack.pop();
        if (false) console.log(state.step, "SZP1[]", n);
        state.zp1 = n;
        switch (n) {
          case 0:
            if (!state.tZone) initTZone(state);
            state.z1 = state.tZone;
            break;
          case 1:
            state.z1 = state.gZone;
            break;
          default:
            throw new Error("Invalid zone pointer");
        }
      }
      function SZP2(state) {
        const n = state.stack.pop();
        if (false) console.log(state.step, "SZP2[]", n);
        state.zp2 = n;
        switch (n) {
          case 0:
            if (!state.tZone) initTZone(state);
            state.z2 = state.tZone;
            break;
          case 1:
            state.z2 = state.gZone;
            break;
          default:
            throw new Error("Invalid zone pointer");
        }
      }
      function SZPS(state) {
        const n = state.stack.pop();
        if (false) console.log(state.step, "SZPS[]", n);
        state.zp0 = state.zp1 = state.zp2 = n;
        switch (n) {
          case 0:
            if (!state.tZone) initTZone(state);
            state.z0 = state.z1 = state.z2 = state.tZone;
            break;
          case 1:
            state.z0 = state.z1 = state.z2 = state.gZone;
            break;
          default:
            throw new Error("Invalid zone pointer");
        }
      }
      function SLOOP(state) {
        state.loop = state.stack.pop();
        if (state.loop > MAX_LOOP_COUNT) {
          state.loop = MAX_LOOP_COUNT;
        }
        if (false) console.log(state.step, "SLOOP[]", state.loop);
      }
      function RTG(state) {
        if (false) console.log(state.step, "RTG[]");
        state.round = roundToGrid;
      }
      function RTHG(state) {
        if (false) console.log(state.step, "RTHG[]");
        state.round = roundToHalfGrid;
      }
      function SMD(state) {
        const d = state.stack.pop();
        if (false) console.log(state.step, "SMD[]", d);
        state.minDis = d / 64;
      }
      function ELSE(state) {
        if (false) console.log(state.step, "ELSE[]");
        skip(state, false);
      }
      function JMPR(state) {
        const o = state.stack.pop();
        if (false) console.log(state.step, "JMPR[]", o);
        state.ip += o - 1;
      }
      function SCVTCI(state) {
        const n = state.stack.pop();
        if (false) console.log(state.step, "SCVTCI[]", n);
        state.cvCutIn = n / 64;
      }
      function DUP(state) {
        const stack = state.stack;
        if (false) console.log(state.step, "DUP[]");
        stack.push(stack[stack.length - 1]);
      }
      function POP(state) {
        if (false) console.log(state.step, "POP[]");
        state.stack.pop();
      }
      function CLEAR(state) {
        if (false) console.log(state.step, "CLEAR[]");
        state.stack.length = 0;
      }
      function SWAP(state) {
        const stack = state.stack;
        const a = stack.pop();
        const b = stack.pop();
        if (false) console.log(state.step, "SWAP[]");
        stack.push(a);
        stack.push(b);
      }
      function DEPTH(state) {
        const stack = state.stack;
        if (false) console.log(state.step, "DEPTH[]");
        stack.push(stack.length);
      }
      function LOOPCALL(state) {
        const stack = state.stack;
        const fn = stack.pop();
        let c = stack.pop();
        if (c > MAX_LOOP_COUNT) c = MAX_LOOP_COUNT;
        if (false) console.log(state.step, "LOOPCALL[]", fn, c);
        if (++state.callDepth > MAX_CALL_DEPTH2) {
          throw new Error("Hinting call depth exceeded maximum of " + MAX_CALL_DEPTH2);
        }
        const cip = state.ip;
        const cprog = state.prog;
        state.prog = state.funcs[fn];
        for (let i = 0; i < c; i++) {
          exec(state);
          if (false) console.log(
            ++state.step,
            i + 1 < c ? "next loopcall" : "done loopcall",
            i
          );
        }
        state.ip = cip;
        state.prog = cprog;
        state.callDepth--;
      }
      function CALL(state) {
        const fn = state.stack.pop();
        if (false) console.log(state.step, "CALL[]", fn);
        if (++state.callDepth > MAX_CALL_DEPTH2) {
          throw new Error("Hinting call depth exceeded maximum of " + MAX_CALL_DEPTH2);
        }
        const cip = state.ip;
        const cprog = state.prog;
        state.prog = state.funcs[fn];
        exec(state);
        state.ip = cip;
        state.prog = cprog;
        state.callDepth--;
        if (false) console.log(++state.step, "returning from", fn);
      }
      function CINDEX(state) {
        const stack = state.stack;
        const k = stack.pop();
        if (false) console.log(state.step, "CINDEX[]", k);
        stack.push(stack[stack.length - k]);
      }
      function MINDEX(state) {
        const stack = state.stack;
        const k = stack.pop();
        if (false) console.log(state.step, "MINDEX[]", k);
        stack.push(stack.splice(stack.length - k, 1)[0]);
      }
      function FDEF(state) {
        if (state.env !== "fpgm") throw new Error("FDEF not allowed here");
        const stack = state.stack;
        const prog = state.prog;
        let ip = state.ip;
        const fn = stack.pop();
        const ipBegin = ip;
        if (false) console.log(state.step, "FDEF[]", fn);
        while (prog[++ip] !== 45) ;
        state.ip = ip;
        state.funcs[fn] = prog.slice(ipBegin + 1, ip);
      }
      function MDAP(round2, state) {
        const pi = state.stack.pop();
        const p = state.z0[pi];
        const fv = state.fv;
        const pv = state.pv;
        if (false) console.log(state.step, "MDAP[" + round2 + "]", pi);
        let d = pv.distance(p, HPZero);
        if (round2) d = state.round(d);
        fv.setRelative(p, HPZero, d, pv);
        fv.touch(p);
        state.rp0 = state.rp1 = pi;
      }
      function IUP(v, state) {
        const z2 = state.z2;
        const pLen = z2.length - 2;
        let cp;
        let pp;
        let np;
        if (false) console.log(state.step, "IUP[" + v.axis + "]");
        for (let i = 0; i < pLen; i++) {
          cp = z2[i];
          if (v.touched(cp)) continue;
          pp = cp.prevTouched(v);
          if (pp === cp) continue;
          np = cp.nextTouched(v);
          if (pp === np) {
            v.setRelative(cp, cp, v.distance(pp, pp, false, true), v, true);
          }
          v.interpolate(cp, pp, np, v);
        }
      }
      function SHP(a, state) {
        const stack = state.stack;
        const rpi = a ? state.rp1 : state.rp2;
        const rp = (a ? state.z0 : state.z1)[rpi];
        const fv = state.fv;
        const pv = state.pv;
        let loop = state.loop;
        const z2 = state.z2;
        while (loop--) {
          const pi = stack.pop();
          const p = z2[pi];
          const d = pv.distance(rp, rp, false, true);
          fv.setRelative(p, p, d, pv);
          fv.touch(p);
          if (false) {
            console.log(
              state.step,
              (state.loop > 1 ? "loop " + (state.loop - loop) + ": " : "") + "SHP[" + (a ? "rp1" : "rp2") + "]",
              pi
            );
          }
        }
        state.loop = 1;
      }
      function SHC(a, state) {
        const stack = state.stack;
        const rpi = a ? state.rp1 : state.rp2;
        const rp = (a ? state.z0 : state.z1)[rpi];
        const fv = state.fv;
        const pv = state.pv;
        const ci = stack.pop();
        const sp = state.z2[state.contours[ci]];
        let p = sp;
        if (false) console.log(state.step, "SHC[" + a + "]", ci);
        const d = pv.distance(rp, rp, false, true);
        do {
          if (p !== rp) fv.setRelative(p, p, d, pv);
          p = p.nextPointOnContour;
        } while (p !== sp);
      }
      function SHZ(a, state) {
        const stack = state.stack;
        const rpi = a ? state.rp1 : state.rp2;
        const rp = (a ? state.z0 : state.z1)[rpi];
        const fv = state.fv;
        const pv = state.pv;
        const e = stack.pop();
        if (false) console.log(state.step, "SHZ[" + a + "]", e);
        let z;
        switch (e) {
          case 0:
            z = state.tZone;
            break;
          case 1:
            z = state.gZone;
            break;
          default:
            throw new Error("Invalid zone");
        }
        let p;
        const d = pv.distance(rp, rp, false, true);
        const pLen = z.length - 2;
        for (let i = 0; i < pLen; i++) {
          p = z[i];
          fv.setRelative(p, p, d, pv);
        }
      }
      function SHPIX(state) {
        const stack = state.stack;
        let loop = state.loop;
        const fv = state.fv;
        const d = stack.pop() / 64;
        const z2 = state.z2;
        while (loop--) {
          const pi = stack.pop();
          const p = z2[pi];
          if (false) {
            console.log(
              state.step,
              (state.loop > 1 ? "loop " + (state.loop - loop) + ": " : "") + "SHPIX[]",
              pi,
              d
            );
          }
          fv.setRelative(p, p, d);
          fv.touch(p);
        }
        state.loop = 1;
      }
      function IP(state) {
        const stack = state.stack;
        const rp1i = state.rp1;
        const rp2i = state.rp2;
        let loop = state.loop;
        const rp1 = state.z0[rp1i];
        const rp2 = state.z1[rp2i];
        const fv = state.fv;
        const pv = state.dpv;
        const z2 = state.z2;
        while (loop--) {
          const pi = stack.pop();
          const p = z2[pi];
          if (false) {
            console.log(
              state.step,
              (state.loop > 1 ? "loop " + (state.loop - loop) + ": " : "") + "IP[]",
              pi,
              rp1i,
              "<->",
              rp2i
            );
          }
          fv.interpolate(p, rp1, rp2, pv);
          fv.touch(p);
        }
        state.loop = 1;
      }
      function MSIRP(a, state) {
        const stack = state.stack;
        const d = stack.pop() / 64;
        const pi = stack.pop();
        const p = state.z1[pi];
        const rp0 = state.z0[state.rp0];
        const fv = state.fv;
        const pv = state.pv;
        fv.setRelative(p, rp0, d, pv);
        fv.touch(p);
        if (false) console.log(state.step, "MSIRP[" + a + "]", d, pi);
        state.rp1 = state.rp0;
        state.rp2 = pi;
        if (a) state.rp0 = pi;
      }
      function ALIGNRP(state) {
        const stack = state.stack;
        const rp0i = state.rp0;
        const rp0 = state.z0[rp0i];
        let loop = state.loop;
        const fv = state.fv;
        const pv = state.pv;
        const z1 = state.z1;
        while (loop--) {
          const pi = stack.pop();
          const p = z1[pi];
          if (false) {
            console.log(
              state.step,
              (state.loop > 1 ? "loop " + (state.loop - loop) + ": " : "") + "ALIGNRP[]",
              pi
            );
          }
          fv.setRelative(p, rp0, 0, pv);
          fv.touch(p);
        }
        state.loop = 1;
      }
      function RTDG(state) {
        if (false) console.log(state.step, "RTDG[]");
        state.round = roundToDoubleGrid;
      }
      function MIAP(round2, state) {
        const stack = state.stack;
        const n = stack.pop();
        const pi = stack.pop();
        const p = state.z0[pi];
        const fv = state.fv;
        const pv = state.pv;
        let cv = state.cvt[n];
        if (false) {
          console.log(
            state.step,
            "MIAP[" + round2 + "]",
            n,
            "(",
            cv,
            ")",
            pi
          );
        }
        let d = pv.distance(p, HPZero);
        if (round2) {
          if (Math.abs(d - cv) < state.cvCutIn) d = cv;
          d = state.round(d);
        }
        fv.setRelative(p, HPZero, d, pv);
        if (state.zp0 === 0) {
          p.xo = p.x;
          p.yo = p.y;
        }
        fv.touch(p);
        state.rp0 = state.rp1 = pi;
      }
      function NPUSHB(state) {
        const prog = state.prog;
        let ip = state.ip;
        const stack = state.stack;
        const n = prog[++ip];
        if (false) console.log(state.step, "NPUSHB[]", n);
        for (let i = 0; i < n; i++) stack.push(prog[++ip]);
        state.ip = ip;
      }
      function NPUSHW(state) {
        let ip = state.ip;
        const prog = state.prog;
        const stack = state.stack;
        const n = prog[++ip];
        if (false) console.log(state.step, "NPUSHW[]", n);
        for (let i = 0; i < n; i++) {
          let w = prog[++ip] << 8 | prog[++ip];
          if (w & 32768) w = -((w ^ 65535) + 1);
          stack.push(w);
        }
        state.ip = ip;
      }
      function WS(state) {
        const stack = state.stack;
        let store = state.store;
        if (!store) store = state.store = [];
        const v = stack.pop();
        const l = stack.pop();
        if (false) console.log(state.step, "WS", v, l);
        store[l] = v;
      }
      function RS(state) {
        const stack = state.stack;
        const store = state.store;
        const l = stack.pop();
        if (false) console.log(state.step, "RS", l);
        const v = store && store[l] || 0;
        stack.push(v);
      }
      function WCVTP(state) {
        const stack = state.stack;
        const v = stack.pop();
        const l = stack.pop();
        if (false) console.log(state.step, "WCVTP", v, l);
        state.cvt[l] = v / 64;
      }
      function RCVT(state) {
        const stack = state.stack;
        const cvte = stack.pop();
        if (false) console.log(state.step, "RCVT", cvte);
        stack.push(state.cvt[cvte] * 64);
      }
      function GC(a, state) {
        const stack = state.stack;
        const pi = stack.pop();
        const p = state.z2[pi];
        if (false) console.log(state.step, "GC[" + a + "]", pi);
        stack.push(state.dpv.distance(p, HPZero, a, false) * 64);
      }
      function MD(a, state) {
        const stack = state.stack;
        const pi2 = stack.pop();
        const pi1 = stack.pop();
        const p2 = state.z1[pi2];
        const p1 = state.z0[pi1];
        const d = state.dpv.distance(p1, p2, a, a);
        if (false) console.log(state.step, "MD[" + a + "]", pi2, pi1, "->", d);
        state.stack.push(Math.round(d * 64));
      }
      function MPPEM(state) {
        if (false) console.log(state.step, "MPPEM[]");
        state.stack.push(state.ppem);
      }
      function FLIPON(state) {
        if (false) console.log(state.step, "FLIPON[]");
        state.autoFlip = true;
      }
      function LT(state) {
        const stack = state.stack;
        const e2 = stack.pop();
        const e1 = stack.pop();
        if (false) console.log(state.step, "LT[]", e2, e1);
        stack.push(e1 < e2 ? 1 : 0);
      }
      function LTEQ(state) {
        const stack = state.stack;
        const e2 = stack.pop();
        const e1 = stack.pop();
        if (false) console.log(state.step, "LTEQ[]", e2, e1);
        stack.push(e1 <= e2 ? 1 : 0);
      }
      function GT(state) {
        const stack = state.stack;
        const e2 = stack.pop();
        const e1 = stack.pop();
        if (false) console.log(state.step, "GT[]", e2, e1);
        stack.push(e1 > e2 ? 1 : 0);
      }
      function GTEQ(state) {
        const stack = state.stack;
        const e2 = stack.pop();
        const e1 = stack.pop();
        if (false) console.log(state.step, "GTEQ[]", e2, e1);
        stack.push(e1 >= e2 ? 1 : 0);
      }
      function EQ(state) {
        const stack = state.stack;
        const e2 = stack.pop();
        const e1 = stack.pop();
        if (false) console.log(state.step, "EQ[]", e2, e1);
        stack.push(e2 === e1 ? 1 : 0);
      }
      function NEQ(state) {
        const stack = state.stack;
        const e2 = stack.pop();
        const e1 = stack.pop();
        if (false) console.log(state.step, "NEQ[]", e2, e1);
        stack.push(e2 !== e1 ? 1 : 0);
      }
      function ODD(state) {
        const stack = state.stack;
        const n = stack.pop();
        if (false) console.log(state.step, "ODD[]", n);
        stack.push(Math.trunc(n) & 1 ? 1 : 0);
      }
      function EVEN(state) {
        const stack = state.stack;
        const n = stack.pop();
        if (false) console.log(state.step, "EVEN[]", n);
        stack.push(Math.trunc(n) & 1 ? 0 : 1);
      }
      function IF(state) {
        let test = state.stack.pop();
        let ins;
        if (false) console.log(state.step, "IF[]", test);
        if (!test) {
          skip(state, true);
          if (false) console.log(state.step, ins === 27 ? "ELSE[]" : "EIF[]");
        }
      }
      function EIF(state) {
        if (false) console.log(state.step, "EIF[]");
      }
      function AND(state) {
        const stack = state.stack;
        const e2 = stack.pop();
        const e1 = stack.pop();
        if (false) console.log(state.step, "AND[]", e2, e1);
        stack.push(e2 && e1 ? 1 : 0);
      }
      function OR(state) {
        const stack = state.stack;
        const e2 = stack.pop();
        const e1 = stack.pop();
        if (false) console.log(state.step, "OR[]", e2, e1);
        stack.push(e2 || e1 ? 1 : 0);
      }
      function NOT(state) {
        const stack = state.stack;
        const e = stack.pop();
        if (false) console.log(state.step, "NOT[]", e);
        stack.push(e ? 0 : 1);
      }
      function DELTAP123(b, state) {
        const stack = state.stack;
        const n = stack.pop();
        const fv = state.fv;
        const pv = state.pv;
        const ppem = state.ppem;
        const base = state.deltaBase + (b - 1) * 16;
        const ds = state.deltaShift;
        const z0 = state.z0;
        if (false) console.log(state.step, "DELTAP[" + b + "]", n, stack);
        for (let i = 0; i < n; i++) {
          const pi = stack.pop();
          const arg = stack.pop();
          const appem = base + ((arg & 240) >> 4);
          if (appem !== ppem) continue;
          let mag = (arg & 15) - 8;
          if (mag >= 0) mag++;
          if (false) console.log(state.step, "DELTAPFIX", pi, "by", mag * ds);
          const p = z0[pi];
          fv.setRelative(p, p, mag * ds, pv);
        }
      }
      function SDB(state) {
        const stack = state.stack;
        const n = stack.pop();
        if (false) console.log(state.step, "SDB[]", n);
        state.deltaBase = n;
      }
      function SDS(state) {
        const stack = state.stack;
        const n = stack.pop();
        if (false) console.log(state.step, "SDS[]", n);
        state.deltaShift = Math.pow(0.5, n);
      }
      function ADD(state) {
        const stack = state.stack;
        const n2 = stack.pop();
        const n1 = stack.pop();
        if (false) console.log(state.step, "ADD[]", n2, n1);
        stack.push(n1 + n2);
      }
      function SUB(state) {
        const stack = state.stack;
        const n2 = stack.pop();
        const n1 = stack.pop();
        if (false) console.log(state.step, "SUB[]", n2, n1);
        stack.push(n1 - n2);
      }
      function DIV(state) {
        const stack = state.stack;
        const n2 = stack.pop();
        const n1 = stack.pop();
        if (false) console.log(state.step, "DIV[]", n2, n1);
        stack.push(n1 * 64 / n2);
      }
      function MUL(state) {
        const stack = state.stack;
        const n2 = stack.pop();
        const n1 = stack.pop();
        if (false) console.log(state.step, "MUL[]", n2, n1);
        stack.push(n1 * n2 / 64);
      }
      function ABS(state) {
        const stack = state.stack;
        const n = stack.pop();
        if (false) console.log(state.step, "ABS[]", n);
        stack.push(Math.abs(n));
      }
      function NEG(state) {
        const stack = state.stack;
        let n = stack.pop();
        if (false) console.log(state.step, "NEG[]", n);
        stack.push(-n);
      }
      function FLOOR(state) {
        const stack = state.stack;
        const n = stack.pop();
        if (false) console.log(state.step, "FLOOR[]", n);
        stack.push(Math.floor(n / 64) * 64);
      }
      function CEILING(state) {
        const stack = state.stack;
        const n = stack.pop();
        if (false) console.log(state.step, "CEILING[]", n);
        stack.push(Math.ceil(n / 64) * 64);
      }
      function ROUND(dt, state) {
        const stack = state.stack;
        const n = stack.pop();
        if (false) console.log(state.step, "ROUND[]");
        stack.push(state.round(n / 64) * 64);
      }
      function WCVTF(state) {
        const stack = state.stack;
        const v = stack.pop();
        const l = stack.pop();
        if (false) console.log(state.step, "WCVTF[]", v, l);
        state.cvt[l] = v * state.ppem / state.font.unitsPerEm;
      }
      function DELTAC123(b, state) {
        const stack = state.stack;
        const n = stack.pop();
        const ppem = state.ppem;
        const base = state.deltaBase + (b - 1) * 16;
        const ds = state.deltaShift;
        if (false) console.log(state.step, "DELTAC[" + b + "]", n, stack);
        for (let i = 0; i < n; i++) {
          const c = stack.pop();
          const arg = stack.pop();
          const appem = base + ((arg & 240) >> 4);
          if (appem !== ppem) continue;
          let mag = (arg & 15) - 8;
          if (mag >= 0) mag++;
          const delta = mag * ds;
          if (false) console.log(state.step, "DELTACFIX", c, "by", delta);
          state.cvt[c] += delta;
        }
      }
      function SROUND(state) {
        let n = state.stack.pop();
        if (false) console.log(state.step, "SROUND[]", n);
        state.round = roundSuper;
        let period;
        switch (n & 192) {
          case 0:
            period = 0.5;
            break;
          case 64:
            period = 1;
            break;
          case 128:
            period = 2;
            break;
          default:
            throw new Error("invalid SROUND value");
        }
        state.srPeriod = period;
        switch (n & 48) {
          case 0:
            state.srPhase = 0;
            break;
          case 16:
            state.srPhase = 0.25 * period;
            break;
          case 32:
            state.srPhase = 0.5 * period;
            break;
          case 48:
            state.srPhase = 0.75 * period;
            break;
          default:
            throw new Error("invalid SROUND value");
        }
        n &= 15;
        if (n === 0) state.srThreshold = 0;
        else state.srThreshold = (n / 8 - 0.5) * period;
      }
      function S45ROUND(state) {
        let n = state.stack.pop();
        if (false) console.log(state.step, "S45ROUND[]", n);
        state.round = roundSuper;
        let period;
        switch (n & 192) {
          case 0:
            period = Math.sqrt(2) / 2;
            break;
          case 64:
            period = Math.sqrt(2);
            break;
          case 128:
            period = 2 * Math.sqrt(2);
            break;
          default:
            throw new Error("invalid S45ROUND value");
        }
        state.srPeriod = period;
        switch (n & 48) {
          case 0:
            state.srPhase = 0;
            break;
          case 16:
            state.srPhase = 0.25 * period;
            break;
          case 32:
            state.srPhase = 0.5 * period;
            break;
          case 48:
            state.srPhase = 0.75 * period;
            break;
          default:
            throw new Error("invalid S45ROUND value");
        }
        n &= 15;
        if (n === 0) state.srThreshold = 0;
        else state.srThreshold = (n / 8 - 0.5) * period;
      }
      function ROFF(state) {
        if (false) console.log(state.step, "ROFF[]");
        state.round = roundOff;
      }
      function RUTG(state) {
        if (false) console.log(state.step, "RUTG[]");
        state.round = roundUpToGrid;
      }
      function RDTG(state) {
        if (false) console.log(state.step, "RDTG[]");
        state.round = roundDownToGrid;
      }
      function SCANCTRL(state) {
        const n = state.stack.pop();
        if (false) console.log(state.step, "SCANCTRL[]", n);
      }
      function SDPVTL(a, state) {
        const stack = state.stack;
        const p2i = stack.pop();
        const p1i = stack.pop();
        const p2 = state.z2[p2i];
        const p1 = state.z1[p1i];
        if (false) console.log(state.step, "SDPVTL[" + a + "]", p2i, p1i);
        let dx;
        let dy;
        if (!a) {
          dx = p1.x - p2.x;
          dy = p1.y - p2.y;
        } else {
          dx = p2.y - p1.y;
          dy = p1.x - p2.x;
        }
        state.dpv = getUnitVector(dx, dy);
      }
      function GETINFO(state) {
        const stack = state.stack;
        const sel = stack.pop();
        let r = 0;
        if (false) console.log(state.step, "GETINFO[]", sel);
        if (sel & 1) r = 35;
        if (sel & 32) r |= 4096;
        stack.push(r);
      }
      function ROLL(state) {
        const stack = state.stack;
        const a = stack.pop();
        const b = stack.pop();
        const c = stack.pop();
        if (false) console.log(state.step, "ROLL[]");
        stack.push(b);
        stack.push(a);
        stack.push(c);
      }
      function MAX(state) {
        const stack = state.stack;
        const e2 = stack.pop();
        const e1 = stack.pop();
        if (false) console.log(state.step, "MAX[]", e2, e1);
        stack.push(Math.max(e1, e2));
      }
      function MIN(state) {
        const stack = state.stack;
        const e2 = stack.pop();
        const e1 = stack.pop();
        if (false) console.log(state.step, "MIN[]", e2, e1);
        stack.push(Math.min(e1, e2));
      }
      function SCANTYPE(state) {
        const n = state.stack.pop();
        if (false) console.log(state.step, "SCANTYPE[]", n);
      }
      function INSTCTRL(state) {
        const s = state.stack.pop();
        let v = state.stack.pop();
        if (false) console.log(state.step, "INSTCTRL[]", s, v);
        switch (s) {
          case 1:
            state.inhibitGridFit = !!v;
            return;
          case 2:
            state.ignoreCvt = !!v;
            return;
          default:
            throw new Error("invalid INSTCTRL[] selector");
        }
      }
      function PUSHB(n, state) {
        const stack = state.stack;
        const prog = state.prog;
        let ip = state.ip;
        if (false) console.log(state.step, "PUSHB[" + n + "]");
        for (let i = 0; i < n; i++) stack.push(prog[++ip]);
        state.ip = ip;
      }
      function PUSHW(n, state) {
        let ip = state.ip;
        const prog = state.prog;
        const stack = state.stack;
        if (false) console.log(state.ip, "PUSHW[" + n + "]");
        for (let i = 0; i < n; i++) {
          let w = prog[++ip] << 8 | prog[++ip];
          if (w & 32768) w = -((w ^ 65535) + 1);
          stack.push(w);
        }
        state.ip = ip;
      }
      function MDRP_MIRP(indirect, setRp0, keepD, ro, dt, state) {
        const stack = state.stack;
        const cvte = indirect && stack.pop();
        const pi = stack.pop();
        const rp0i = state.rp0;
        const rp = state.z0[rp0i];
        const p = state.z1[pi];
        const md = state.minDis;
        const fv = state.fv;
        const pv = state.dpv;
        let od;
        let d;
        let sign;
        let cv;
        d = od = pv.distance(p, rp, true, true);
        sign = d >= 0 ? 1 : -1;
        d = Math.abs(d);
        if (indirect) {
          cv = state.cvt[cvte];
          if (ro && Math.abs(d - cv) < state.cvCutIn) d = cv;
        }
        if (keepD && d < md) d = md;
        if (ro) d = state.round(d);
        fv.setRelative(p, rp, sign * d, pv);
        fv.touch(p);
        if (false) {
          console.log(
            state.step,
            (indirect ? "MIRP[" : "MDRP[") + (setRp0 ? "M" : "m") + (keepD ? ">" : "_") + (ro ? "R" : "_") + (dt === 0 ? "Gr" : dt === 1 ? "Bl" : dt === 2 ? "Wh" : "") + "]",
            indirect ? cvte + "(" + state.cvt[cvte] + "," + cv + ")" : "",
            pi,
            "(d =",
            od,
            "->",
            sign * d,
            ")"
          );
        }
        state.rp1 = state.rp0;
        state.rp2 = pi;
        if (setRp0) state.rp0 = pi;
      }
      instructionTable = [
        /* 0x00 */
        SVTCA.bind(void 0, yUnitVector),
        /* 0x01 */
        SVTCA.bind(void 0, xUnitVector),
        /* 0x02 */
        SPVTCA.bind(void 0, yUnitVector),
        /* 0x03 */
        SPVTCA.bind(void 0, xUnitVector),
        /* 0x04 */
        SFVTCA.bind(void 0, yUnitVector),
        /* 0x05 */
        SFVTCA.bind(void 0, xUnitVector),
        /* 0x06 */
        SPVTL.bind(void 0, 0),
        /* 0x07 */
        SPVTL.bind(void 0, 1),
        /* 0x08 */
        SFVTL.bind(void 0, 0),
        /* 0x09 */
        SFVTL.bind(void 0, 1),
        /* 0x0A */
        SPVFS,
        /* 0x0B */
        SFVFS,
        /* 0x0C */
        GPV,
        /* 0x0D */
        GFV,
        /* 0x0E */
        SFVTPV,
        /* 0x0F */
        ISECT,
        /* 0x10 */
        SRP0,
        /* 0x11 */
        SRP1,
        /* 0x12 */
        SRP2,
        /* 0x13 */
        SZP0,
        /* 0x14 */
        SZP1,
        /* 0x15 */
        SZP2,
        /* 0x16 */
        SZPS,
        /* 0x17 */
        SLOOP,
        /* 0x18 */
        RTG,
        /* 0x19 */
        RTHG,
        /* 0x1A */
        SMD,
        /* 0x1B */
        ELSE,
        /* 0x1C */
        JMPR,
        /* 0x1D */
        SCVTCI,
        /* 0x1E */
        void 0,
        // TODO SSWCI
        /* 0x1F */
        void 0,
        // TODO SSW
        /* 0x20 */
        DUP,
        /* 0x21 */
        POP,
        /* 0x22 */
        CLEAR,
        /* 0x23 */
        SWAP,
        /* 0x24 */
        DEPTH,
        /* 0x25 */
        CINDEX,
        /* 0x26 */
        MINDEX,
        /* 0x27 */
        void 0,
        // TODO ALIGNPTS
        /* 0x28 */
        void 0,
        /* 0x29 */
        void 0,
        // TODO UTP
        /* 0x2A */
        LOOPCALL,
        /* 0x2B */
        CALL,
        /* 0x2C */
        FDEF,
        /* 0x2D */
        void 0,
        // ENDF (eaten by FDEF)
        /* 0x2E */
        MDAP.bind(void 0, 0),
        /* 0x2F */
        MDAP.bind(void 0, 1),
        /* 0x30 */
        IUP.bind(void 0, yUnitVector),
        /* 0x31 */
        IUP.bind(void 0, xUnitVector),
        /* 0x32 */
        SHP.bind(void 0, 0),
        /* 0x33 */
        SHP.bind(void 0, 1),
        /* 0x34 */
        SHC.bind(void 0, 0),
        /* 0x35 */
        SHC.bind(void 0, 1),
        /* 0x36 */
        SHZ.bind(void 0, 0),
        /* 0x37 */
        SHZ.bind(void 0, 1),
        /* 0x38 */
        SHPIX,
        /* 0x39 */
        IP,
        /* 0x3A */
        MSIRP.bind(void 0, 0),
        /* 0x3B */
        MSIRP.bind(void 0, 1),
        /* 0x3C */
        ALIGNRP,
        /* 0x3D */
        RTDG,
        /* 0x3E */
        MIAP.bind(void 0, 0),
        /* 0x3F */
        MIAP.bind(void 0, 1),
        /* 0x40 */
        NPUSHB,
        /* 0x41 */
        NPUSHW,
        /* 0x42 */
        WS,
        /* 0x43 */
        RS,
        /* 0x44 */
        WCVTP,
        /* 0x45 */
        RCVT,
        /* 0x46 */
        GC.bind(void 0, 0),
        /* 0x47 */
        GC.bind(void 0, 1),
        /* 0x48 */
        void 0,
        // TODO SCFS
        /* 0x49 */
        MD.bind(void 0, 0),
        /* 0x4A */
        MD.bind(void 0, 1),
        /* 0x4B */
        MPPEM,
        /* 0x4C */
        void 0,
        // TODO MPS
        /* 0x4D */
        FLIPON,
        /* 0x4E */
        void 0,
        // TODO FLIPOFF
        /* 0x4F */
        void 0,
        // TODO DEBUG
        /* 0x50 */
        LT,
        /* 0x51 */
        LTEQ,
        /* 0x52 */
        GT,
        /* 0x53 */
        GTEQ,
        /* 0x54 */
        EQ,
        /* 0x55 */
        NEQ,
        /* 0x56 */
        ODD,
        /* 0x57 */
        EVEN,
        /* 0x58 */
        IF,
        /* 0x59 */
        EIF,
        /* 0x5A */
        AND,
        /* 0x5B */
        OR,
        /* 0x5C */
        NOT,
        /* 0x5D */
        DELTAP123.bind(void 0, 1),
        /* 0x5E */
        SDB,
        /* 0x5F */
        SDS,
        /* 0x60 */
        ADD,
        /* 0x61 */
        SUB,
        /* 0x62 */
        DIV,
        /* 0x63 */
        MUL,
        /* 0x64 */
        ABS,
        /* 0x65 */
        NEG,
        /* 0x66 */
        FLOOR,
        /* 0x67 */
        CEILING,
        /* 0x68 */
        ROUND.bind(void 0, 0),
        /* 0x69 */
        ROUND.bind(void 0, 1),
        /* 0x6A */
        ROUND.bind(void 0, 2),
        /* 0x6B */
        ROUND.bind(void 0, 3),
        /* 0x6C */
        void 0,
        // TODO NROUND[ab]
        /* 0x6D */
        void 0,
        // TODO NROUND[ab]
        /* 0x6E */
        void 0,
        // TODO NROUND[ab]
        /* 0x6F */
        void 0,
        // TODO NROUND[ab]
        /* 0x70 */
        WCVTF,
        /* 0x71 */
        DELTAP123.bind(void 0, 2),
        /* 0x72 */
        DELTAP123.bind(void 0, 3),
        /* 0x73 */
        DELTAC123.bind(void 0, 1),
        /* 0x74 */
        DELTAC123.bind(void 0, 2),
        /* 0x75 */
        DELTAC123.bind(void 0, 3),
        /* 0x76 */
        SROUND,
        /* 0x77 */
        S45ROUND,
        /* 0x78 */
        void 0,
        // TODO JROT[]
        /* 0x79 */
        void 0,
        // TODO JROF[]
        /* 0x7A */
        ROFF,
        /* 0x7B */
        void 0,
        /* 0x7C */
        RUTG,
        /* 0x7D */
        RDTG,
        /* 0x7E */
        POP,
        // actually SANGW, supposed to do only a pop though
        /* 0x7F */
        POP,
        // actually AA, supposed to do only a pop though
        /* 0x80 */
        void 0,
        // TODO FLIPPT
        /* 0x81 */
        void 0,
        // TODO FLIPRGON
        /* 0x82 */
        void 0,
        // TODO FLIPRGOFF
        /* 0x83 */
        void 0,
        /* 0x84 */
        void 0,
        /* 0x85 */
        SCANCTRL,
        /* 0x86 */
        SDPVTL.bind(void 0, 0),
        /* 0x87 */
        SDPVTL.bind(void 0, 1),
        /* 0x88 */
        GETINFO,
        /* 0x89 */
        void 0,
        // TODO IDEF
        /* 0x8A */
        ROLL,
        /* 0x8B */
        MAX,
        /* 0x8C */
        MIN,
        /* 0x8D */
        SCANTYPE,
        /* 0x8E */
        INSTCTRL,
        /* 0x8F */
        void 0,
        /* 0x90 */
        void 0,
        /* 0x91 */
        void 0,
        /* 0x92 */
        void 0,
        /* 0x93 */
        void 0,
        /* 0x94 */
        void 0,
        /* 0x95 */
        void 0,
        /* 0x96 */
        void 0,
        /* 0x97 */
        void 0,
        /* 0x98 */
        void 0,
        /* 0x99 */
        void 0,
        /* 0x9A */
        void 0,
        /* 0x9B */
        void 0,
        /* 0x9C */
        void 0,
        /* 0x9D */
        void 0,
        /* 0x9E */
        void 0,
        /* 0x9F */
        void 0,
        /* 0xA0 */
        void 0,
        /* 0xA1 */
        void 0,
        /* 0xA2 */
        void 0,
        /* 0xA3 */
        void 0,
        /* 0xA4 */
        void 0,
        /* 0xA5 */
        void 0,
        /* 0xA6 */
        void 0,
        /* 0xA7 */
        void 0,
        /* 0xA8 */
        void 0,
        /* 0xA9 */
        void 0,
        /* 0xAA */
        void 0,
        /* 0xAB */
        void 0,
        /* 0xAC */
        void 0,
        /* 0xAD */
        void 0,
        /* 0xAE */
        void 0,
        /* 0xAF */
        void 0,
        /* 0xB0 */
        PUSHB.bind(void 0, 1),
        /* 0xB1 */
        PUSHB.bind(void 0, 2),
        /* 0xB2 */
        PUSHB.bind(void 0, 3),
        /* 0xB3 */
        PUSHB.bind(void 0, 4),
        /* 0xB4 */
        PUSHB.bind(void 0, 5),
        /* 0xB5 */
        PUSHB.bind(void 0, 6),
        /* 0xB6 */
        PUSHB.bind(void 0, 7),
        /* 0xB7 */
        PUSHB.bind(void 0, 8),
        /* 0xB8 */
        PUSHW.bind(void 0, 1),
        /* 0xB9 */
        PUSHW.bind(void 0, 2),
        /* 0xBA */
        PUSHW.bind(void 0, 3),
        /* 0xBB */
        PUSHW.bind(void 0, 4),
        /* 0xBC */
        PUSHW.bind(void 0, 5),
        /* 0xBD */
        PUSHW.bind(void 0, 6),
        /* 0xBE */
        PUSHW.bind(void 0, 7),
        /* 0xBF */
        PUSHW.bind(void 0, 8),
        /* 0xC0 */
        MDRP_MIRP.bind(void 0, 0, 0, 0, 0, 0),
        /* 0xC1 */
        MDRP_MIRP.bind(void 0, 0, 0, 0, 0, 1),
        /* 0xC2 */
        MDRP_MIRP.bind(void 0, 0, 0, 0, 0, 2),
        /* 0xC3 */
        MDRP_MIRP.bind(void 0, 0, 0, 0, 0, 3),
        /* 0xC4 */
        MDRP_MIRP.bind(void 0, 0, 0, 0, 1, 0),
        /* 0xC5 */
        MDRP_MIRP.bind(void 0, 0, 0, 0, 1, 1),
        /* 0xC6 */
        MDRP_MIRP.bind(void 0, 0, 0, 0, 1, 2),
        /* 0xC7 */
        MDRP_MIRP.bind(void 0, 0, 0, 0, 1, 3),
        /* 0xC8 */
        MDRP_MIRP.bind(void 0, 0, 0, 1, 0, 0),
        /* 0xC9 */
        MDRP_MIRP.bind(void 0, 0, 0, 1, 0, 1),
        /* 0xCA */
        MDRP_MIRP.bind(void 0, 0, 0, 1, 0, 2),
        /* 0xCB */
        MDRP_MIRP.bind(void 0, 0, 0, 1, 0, 3),
        /* 0xCC */
        MDRP_MIRP.bind(void 0, 0, 0, 1, 1, 0),
        /* 0xCD */
        MDRP_MIRP.bind(void 0, 0, 0, 1, 1, 1),
        /* 0xCE */
        MDRP_MIRP.bind(void 0, 0, 0, 1, 1, 2),
        /* 0xCF */
        MDRP_MIRP.bind(void 0, 0, 0, 1, 1, 3),
        /* 0xD0 */
        MDRP_MIRP.bind(void 0, 0, 1, 0, 0, 0),
        /* 0xD1 */
        MDRP_MIRP.bind(void 0, 0, 1, 0, 0, 1),
        /* 0xD2 */
        MDRP_MIRP.bind(void 0, 0, 1, 0, 0, 2),
        /* 0xD3 */
        MDRP_MIRP.bind(void 0, 0, 1, 0, 0, 3),
        /* 0xD4 */
        MDRP_MIRP.bind(void 0, 0, 1, 0, 1, 0),
        /* 0xD5 */
        MDRP_MIRP.bind(void 0, 0, 1, 0, 1, 1),
        /* 0xD6 */
        MDRP_MIRP.bind(void 0, 0, 1, 0, 1, 2),
        /* 0xD7 */
        MDRP_MIRP.bind(void 0, 0, 1, 0, 1, 3),
        /* 0xD8 */
        MDRP_MIRP.bind(void 0, 0, 1, 1, 0, 0),
        /* 0xD9 */
        MDRP_MIRP.bind(void 0, 0, 1, 1, 0, 1),
        /* 0xDA */
        MDRP_MIRP.bind(void 0, 0, 1, 1, 0, 2),
        /* 0xDB */
        MDRP_MIRP.bind(void 0, 0, 1, 1, 0, 3),
        /* 0xDC */
        MDRP_MIRP.bind(void 0, 0, 1, 1, 1, 0),
        /* 0xDD */
        MDRP_MIRP.bind(void 0, 0, 1, 1, 1, 1),
        /* 0xDE */
        MDRP_MIRP.bind(void 0, 0, 1, 1, 1, 2),
        /* 0xDF */
        MDRP_MIRP.bind(void 0, 0, 1, 1, 1, 3),
        /* 0xE0 */
        MDRP_MIRP.bind(void 0, 1, 0, 0, 0, 0),
        /* 0xE1 */
        MDRP_MIRP.bind(void 0, 1, 0, 0, 0, 1),
        /* 0xE2 */
        MDRP_MIRP.bind(void 0, 1, 0, 0, 0, 2),
        /* 0xE3 */
        MDRP_MIRP.bind(void 0, 1, 0, 0, 0, 3),
        /* 0xE4 */
        MDRP_MIRP.bind(void 0, 1, 0, 0, 1, 0),
        /* 0xE5 */
        MDRP_MIRP.bind(void 0, 1, 0, 0, 1, 1),
        /* 0xE6 */
        MDRP_MIRP.bind(void 0, 1, 0, 0, 1, 2),
        /* 0xE7 */
        MDRP_MIRP.bind(void 0, 1, 0, 0, 1, 3),
        /* 0xE8 */
        MDRP_MIRP.bind(void 0, 1, 0, 1, 0, 0),
        /* 0xE9 */
        MDRP_MIRP.bind(void 0, 1, 0, 1, 0, 1),
        /* 0xEA */
        MDRP_MIRP.bind(void 0, 1, 0, 1, 0, 2),
        /* 0xEB */
        MDRP_MIRP.bind(void 0, 1, 0, 1, 0, 3),
        /* 0xEC */
        MDRP_MIRP.bind(void 0, 1, 0, 1, 1, 0),
        /* 0xED */
        MDRP_MIRP.bind(void 0, 1, 0, 1, 1, 1),
        /* 0xEE */
        MDRP_MIRP.bind(void 0, 1, 0, 1, 1, 2),
        /* 0xEF */
        MDRP_MIRP.bind(void 0, 1, 0, 1, 1, 3),
        /* 0xF0 */
        MDRP_MIRP.bind(void 0, 1, 1, 0, 0, 0),
        /* 0xF1 */
        MDRP_MIRP.bind(void 0, 1, 1, 0, 0, 1),
        /* 0xF2 */
        MDRP_MIRP.bind(void 0, 1, 1, 0, 0, 2),
        /* 0xF3 */
        MDRP_MIRP.bind(void 0, 1, 1, 0, 0, 3),
        /* 0xF4 */
        MDRP_MIRP.bind(void 0, 1, 1, 0, 1, 0),
        /* 0xF5 */
        MDRP_MIRP.bind(void 0, 1, 1, 0, 1, 1),
        /* 0xF6 */
        MDRP_MIRP.bind(void 0, 1, 1, 0, 1, 2),
        /* 0xF7 */
        MDRP_MIRP.bind(void 0, 1, 1, 0, 1, 3),
        /* 0xF8 */
        MDRP_MIRP.bind(void 0, 1, 1, 1, 0, 0),
        /* 0xF9 */
        MDRP_MIRP.bind(void 0, 1, 1, 1, 0, 1),
        /* 0xFA */
        MDRP_MIRP.bind(void 0, 1, 1, 1, 0, 2),
        /* 0xFB */
        MDRP_MIRP.bind(void 0, 1, 1, 1, 0, 3),
        /* 0xFC */
        MDRP_MIRP.bind(void 0, 1, 1, 1, 1, 0),
        /* 0xFD */
        MDRP_MIRP.bind(void 0, 1, 1, 1, 1, 1),
        /* 0xFE */
        MDRP_MIRP.bind(void 0, 1, 1, 1, 1, 2),
        /* 0xFF */
        MDRP_MIRP.bind(void 0, 1, 1, 1, 1, 3)
      ];
      var hintingtt_default = Hinting;
      function Token(char) {
        this.char = char;
        this.state = {};
        this.activeState = null;
      }
      function ContextRange(startIndex, endOffset, contextName) {
        this.contextName = contextName;
        this.startIndex = startIndex;
        this.endOffset = endOffset;
      }
      function ContextChecker(contextName, checkStart, checkEnd) {
        this.contextName = contextName;
        this.openRange = null;
        this.ranges = [];
        this.checkStart = checkStart;
        this.checkEnd = checkEnd;
      }
      function ContextParams(context, currentIndex) {
        this.context = context;
        this.index = currentIndex;
        this.length = context.length;
        this.current = context[currentIndex];
        this.backtrack = context.slice(0, currentIndex);
        this.lookahead = context.slice(currentIndex + 1);
      }
      function Event(eventId) {
        this.eventId = eventId;
        this.subscribers = [];
      }
      function initializeCoreEvents(events) {
        const coreEvents = [
          "start",
          "end",
          "next",
          "newToken",
          "contextStart",
          "contextEnd",
          "insertToken",
          "removeToken",
          "removeRange",
          "replaceToken",
          "replaceRange",
          "composeRUD",
          "updateContextsRanges"
        ];
        for (let i = 0; i < coreEvents.length; i++) {
          const eventId = coreEvents[i];
          Object.defineProperty(this.events, eventId, {
            value: new Event(eventId)
          });
        }
        if (events) {
          for (let i = 0; i < coreEvents.length; i++) {
            const eventId = coreEvents[i];
            const event = events[eventId];
            if (typeof event === "function") {
              this.events[eventId].subscribe(event);
            }
          }
        }
        const requiresContextUpdate = [
          "insertToken",
          "removeToken",
          "removeRange",
          "replaceToken",
          "replaceRange",
          "composeRUD"
        ];
        for (let i = 0; i < requiresContextUpdate.length; i++) {
          const eventId = requiresContextUpdate[i];
          this.events[eventId].subscribe(
            this.updateContextsRanges
          );
        }
      }
      function Tokenizer(events) {
        this.tokens = [];
        this.registeredContexts = {};
        this.contextCheckers = [];
        this.events = {};
        this.registeredModifiers = [];
        initializeCoreEvents.call(this, events);
      }
      Token.prototype.setState = function(key, value) {
        this.state[key] = value;
        this.activeState = { key, value: this.state[key] };
        return this.activeState;
      };
      Token.prototype.getState = function(stateId) {
        return this.state[stateId] || null;
      };
      Tokenizer.prototype.inboundIndex = function(index) {
        return index >= 0 && index < this.tokens.length;
      };
      Tokenizer.prototype.composeRUD = function(RUDs) {
        const silent = true;
        const state = RUDs.map((RUD) => this[RUD[0]].apply(this, RUD.slice(1).concat(silent)));
        const hasFAILObject = (obj) => typeof obj === "object" && Object.prototype.hasOwnProperty.call(obj, "FAIL");
        if (state.every(hasFAILObject)) {
          return {
            FAIL: "composeRUD: one or more operations hasn't completed successfully",
            report: state.filter(hasFAILObject)
          };
        }
        this.dispatch("composeRUD", [state.filter((op) => !hasFAILObject(op))]);
      };
      Tokenizer.prototype.replaceRange = function(startIndex, offset, tokens, silent) {
        offset = offset !== null ? offset : this.tokens.length;
        const isTokenType = tokens.every((token) => token instanceof Token);
        if (!isNaN(startIndex) && this.inboundIndex(startIndex) && isTokenType) {
          const replaced = this.tokens.splice.apply(
            this.tokens,
            [startIndex, offset].concat(tokens)
          );
          if (!silent) this.dispatch("replaceToken", [startIndex, offset, tokens]);
          return [replaced, tokens];
        } else {
          return { FAIL: "replaceRange: invalid tokens or startIndex." };
        }
      };
      Tokenizer.prototype.replaceToken = function(index, token, silent) {
        if (!isNaN(index) && this.inboundIndex(index) && token instanceof Token) {
          const replaced = this.tokens.splice(index, 1, token);
          if (!silent) this.dispatch("replaceToken", [index, token]);
          return [replaced[0], token];
        } else {
          return { FAIL: "replaceToken: invalid token or index." };
        }
      };
      Tokenizer.prototype.removeRange = function(startIndex, offset, silent) {
        offset = !isNaN(offset) ? offset : this.tokens.length;
        const tokens = this.tokens.splice(startIndex, offset);
        if (!silent) this.dispatch("removeRange", [tokens, startIndex, offset]);
        return tokens;
      };
      Tokenizer.prototype.removeToken = function(index, silent) {
        if (!isNaN(index) && this.inboundIndex(index)) {
          const token = this.tokens.splice(index, 1);
          if (!silent) this.dispatch("removeToken", [token, index]);
          return token;
        } else {
          return { FAIL: "removeToken: invalid token index." };
        }
      };
      Tokenizer.prototype.insertToken = function(tokens, index, silent) {
        const tokenType = tokens.every(
          (token) => token instanceof Token
        );
        if (tokenType) {
          this.tokens.splice.apply(
            this.tokens,
            [index, 0].concat(tokens)
          );
          if (!silent) this.dispatch("insertToken", [tokens, index]);
          return tokens;
        } else {
          return { FAIL: "insertToken: invalid token(s)." };
        }
      };
      Tokenizer.prototype.registerModifier = function(modifierId, condition, modifier) {
        this.events.newToken.subscribe(function(token, contextParams) {
          const conditionParams = [token, contextParams];
          const canApplyModifier = condition === null || condition.apply(this, conditionParams) === true;
          const modifierParams = [token, contextParams];
          if (canApplyModifier) {
            let newStateValue = modifier.apply(this, modifierParams);
            token.setState(modifierId, newStateValue);
          }
        });
        this.registeredModifiers.push(modifierId);
      };
      Event.prototype.subscribe = function(eventHandler) {
        if (typeof eventHandler === "function") {
          return this.subscribers.push(eventHandler) - 1;
        } else {
          return { FAIL: `invalid '${this.eventId}' event handler` };
        }
      };
      Event.prototype.unsubscribe = function(subsId) {
        this.subscribers.splice(subsId, 1);
      };
      ContextParams.prototype.setCurrentIndex = function(index) {
        this.index = index;
        this.current = this.context[index];
        this.backtrack = this.context.slice(0, index);
        this.lookahead = this.context.slice(index + 1);
      };
      ContextParams.prototype.get = function(offset) {
        switch (true) {
          case offset === 0:
            return this.current;
          case (offset < 0 && Math.abs(offset) <= this.backtrack.length):
            return this.backtrack.slice(offset)[0];
          case (offset > 0 && offset <= this.lookahead.length):
            return this.lookahead[offset - 1];
          default:
            return null;
        }
      };
      Tokenizer.prototype.rangeToText = function(range) {
        if (range instanceof ContextRange) {
          return this.getRangeTokens(range).map((token) => token.char).join("");
        }
      };
      Tokenizer.prototype.getText = function() {
        return this.tokens.map((token) => token.char).join("");
      };
      Tokenizer.prototype.getContext = function(contextName) {
        let context = this.registeredContexts[contextName];
        return context ? context : null;
      };
      Tokenizer.prototype.on = function(eventName, eventHandler) {
        const event = this.events[eventName];
        if (event) {
          return event.subscribe(eventHandler);
        } else {
          return null;
        }
      };
      Tokenizer.prototype.dispatch = function(eventName, args) {
        const event = this.events[eventName];
        if (event instanceof Event) {
          for (let i = 0; i < event.subscribers.length; i++) {
            const subscriber = event.subscribers[i];
            subscriber.apply(this, args || []);
          }
        }
      };
      Tokenizer.prototype.registerContextChecker = function(contextName, contextStartCheck, contextEndCheck) {
        if (this.getContext(contextName)) return {
          FAIL: `context name '${contextName}' is already registered.`
        };
        if (typeof contextStartCheck !== "function") return {
          FAIL: "missing context start check."
        };
        if (typeof contextEndCheck !== "function") return {
          FAIL: "missing context end check."
        };
        const contextCheckers = new ContextChecker(
          contextName,
          contextStartCheck,
          contextEndCheck
        );
        this.registeredContexts[contextName] = contextCheckers;
        this.contextCheckers.push(contextCheckers);
        return contextCheckers;
      };
      Tokenizer.prototype.getRangeTokens = function(range) {
        const endIndex = range.startIndex + range.endOffset;
        return [].concat(
          this.tokens.slice(range.startIndex, endIndex)
        );
      };
      Tokenizer.prototype.getContextRanges = function(contextName) {
        const context = this.getContext(contextName);
        if (context) {
          return context.ranges;
        } else {
          return { FAIL: `context checker '${contextName}' is not registered.` };
        }
      };
      Tokenizer.prototype.resetContextsRanges = function() {
        const registeredContexts = this.registeredContexts;
        for (const contextName in registeredContexts) {
          if (Object.prototype.hasOwnProperty.call(registeredContexts, contextName)) {
            const context = registeredContexts[contextName];
            context.ranges = [];
          }
        }
      };
      Tokenizer.prototype.updateContextsRanges = function() {
        this.resetContextsRanges();
        const chars = this.tokens.map((token) => token.char);
        for (let i = 0; i < chars.length; i++) {
          const contextParams = new ContextParams(chars, i);
          this.runContextCheck(contextParams);
        }
        this.dispatch("updateContextsRanges", [this.registeredContexts]);
      };
      Tokenizer.prototype.setEndOffset = function(offset, contextName) {
        const startIndex = this.getContext(contextName).openRange.startIndex;
        let range = new ContextRange(startIndex, offset, contextName);
        const ranges = this.getContext(contextName).ranges;
        range.rangeId = `${contextName}.${ranges.length}`;
        ranges.push(range);
        this.getContext(contextName).openRange = null;
        return range;
      };
      Tokenizer.prototype.runContextCheck = function(contextParams) {
        const index = contextParams.index;
        for (let i = 0; i < this.contextCheckers.length; i++) {
          const contextChecker = this.contextCheckers[i];
          let contextName = contextChecker.contextName;
          let openRange = this.getContext(contextName).openRange;
          if (!openRange && contextChecker.checkStart(contextParams)) {
            openRange = new ContextRange(index, null, contextName);
            this.getContext(contextName).openRange = openRange;
            this.dispatch("contextStart", [contextName, index]);
          }
          if (!!openRange && contextChecker.checkEnd(contextParams)) {
            const offset = index - openRange.startIndex + 1;
            const range = this.setEndOffset(offset, contextName);
            this.dispatch("contextEnd", [contextName, range]);
          }
        }
      };
      Tokenizer.prototype.tokenize = function(text) {
        this.tokens = [];
        this.resetContextsRanges();
        let chars = Array.from(text);
        this.dispatch("start");
        for (let i = 0; i < chars.length; i++) {
          const char = chars[i];
          const contextParams = new ContextParams(chars, i);
          this.dispatch("next", [contextParams]);
          this.runContextCheck(contextParams);
          let token = new Token(char);
          this.tokens.push(token);
          this.dispatch("newToken", [token, contextParams]);
        }
        this.dispatch("end", [this.tokens]);
        return this.tokens;
      };
      var tokenizer_default = Tokenizer;
      function isArabicChar(c) {
        return /[\u0600-\u065F\u066A-\u06D2\u06FA-\u06FF]/.test(c);
      }
      function isIsolatedArabicChar(char) {
        return /[\u0630\u0690\u0621\u0631\u0661\u0671\u0622\u0632\u0672\u0692\u06C2\u0623\u0673\u0693\u06C3\u0624\u0694\u06C4\u0625\u0675\u0695\u06C5\u06E5\u0676\u0696\u06C6\u0627\u0677\u0697\u06C7\u0648\u0688\u0698\u06C8\u0689\u0699\u06C9\u068A\u06CA\u066B\u068B\u06CB\u068C\u068D\u06CD\u06FD\u068E\u06EE\u06FE\u062F\u068F\u06CF\u06EF]/.test(char);
      }
      function isTashkeelArabicChar(char) {
        return /[\u0600-\u0605\u060C-\u060E\u0610-\u061B\u061E\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/.test(char);
      }
      function isThaiChar(c) {
        return /[\u0E00-\u0E7F]/.test(c);
      }
      function isLatinChar(c) {
        return /[A-z]/.test(c);
      }
      function isWhiteSpace(c) {
        return /\s/.test(c);
      }
      function FeatureQuery(font) {
        this.font = font;
        this.features = {};
      }
      function SubstitutionAction(action) {
        this.id = action.id;
        this.tag = action.tag;
        this.substitution = action.substitution;
      }
      function lookupCoverage(glyphIndex, coverage) {
        if (!glyphIndex) return -1;
        switch (coverage.format) {
          case 1:
            return coverage.glyphs.indexOf(glyphIndex);
          case 2: {
            let ranges = coverage.ranges;
            for (let i = 0; i < ranges.length; i++) {
              const range = ranges[i];
              if (glyphIndex >= range.start && glyphIndex <= range.end) {
                let offset = glyphIndex - range.start;
                return range.index + offset;
              }
            }
            break;
          }
          default:
            return -1;
        }
        return -1;
      }
      function singleSubstitutionFormat1(glyphIndex, subtable) {
        let substituteIndex = lookupCoverage(glyphIndex, subtable.coverage);
        if (substituteIndex === -1) return null;
        return glyphIndex + subtable.deltaGlyphId;
      }
      function singleSubstitutionFormat2(glyphIndex, subtable) {
        let substituteIndex = lookupCoverage(glyphIndex, subtable.coverage);
        if (substituteIndex === -1) return null;
        return subtable.substitute[substituteIndex];
      }
      function lookupCoverageList(coverageList, contextParams) {
        let lookupList = [];
        for (let i = 0; i < coverageList.length; i++) {
          const coverage = coverageList[i];
          let glyphIndex = contextParams.current;
          glyphIndex = Array.isArray(glyphIndex) ? glyphIndex[0] : glyphIndex;
          const lookupIndex = lookupCoverage(glyphIndex, coverage);
          if (lookupIndex !== -1) {
            lookupList.push(lookupIndex);
          }
        }
        if (lookupList.length !== coverageList.length) return -1;
        return lookupList;
      }
      function chainingSubstitutionFormat3(contextParams, subtable) {
        const lookupsCount = subtable.inputCoverage.length + subtable.lookaheadCoverage.length + subtable.backtrackCoverage.length;
        if (contextParams.context.length < lookupsCount) return [];
        let inputLookups = lookupCoverageList(
          subtable.inputCoverage,
          contextParams
        );
        if (inputLookups === -1) return [];
        const lookaheadOffset = subtable.inputCoverage.length - 1;
        if (contextParams.lookahead.length < subtable.lookaheadCoverage.length) return [];
        let lookaheadContext = contextParams.lookahead.slice(lookaheadOffset);
        while (lookaheadContext.length && isTashkeelArabicChar(lookaheadContext[0].char)) {
          lookaheadContext.shift();
        }
        const lookaheadParams = new ContextParams(lookaheadContext, 0);
        let lookaheadLookups = lookupCoverageList(
          subtable.lookaheadCoverage,
          lookaheadParams
        );
        let backtrackContext = [].concat(contextParams.backtrack);
        backtrackContext.reverse();
        while (backtrackContext.length && isTashkeelArabicChar(backtrackContext[0].char)) {
          backtrackContext.shift();
        }
        if (backtrackContext.length < subtable.backtrackCoverage.length) return [];
        const backtrackParams = new ContextParams(backtrackContext, 0);
        let backtrackLookups = lookupCoverageList(
          subtable.backtrackCoverage,
          backtrackParams
        );
        const contextRulesMatch = inputLookups.length === subtable.inputCoverage.length && lookaheadLookups.length === subtable.lookaheadCoverage.length && backtrackLookups.length === subtable.backtrackCoverage.length;
        let substitutions = [];
        if (contextRulesMatch) {
          for (let i = 0; i < subtable.lookupRecords.length; i++) {
            const lookupRecord = subtable.lookupRecords[i];
            const lookupListIndex = lookupRecord.lookupListIndex;
            const lookupTable = this.getLookupByIndex(lookupListIndex);
            for (let s = 0; s < lookupTable.subtables.length; s++) {
              let subtable2 = lookupTable.subtables[s];
              let lookup;
              let substitutionType = this.getSubstitutionType(lookupTable, subtable2);
              if (substitutionType === "71") {
                substitutionType = this.getSubstitutionType(subtable2, subtable2.extension);
                lookup = this.getLookupMethod(subtable2, subtable2.extension);
                subtable2 = subtable2.extension;
              } else {
                lookup = this.getLookupMethod(lookupTable, subtable2);
              }
              if (substitutionType === "12") {
                const glyphIndex = contextParams.get(lookupRecord.sequenceIndex);
                const substitution = lookup(glyphIndex);
                if (substitution) substitutions.push(substitution);
              } else if (substitutionType === "21") {
                const glyphIndex = contextParams.get(lookupRecord.sequenceIndex);
                const substitution = lookup(glyphIndex);
                if (substitution) substitutions.push(substitution);
              } else {
                throw new Error(`Substitution type ${substitutionType} is not supported in chaining substitution`);
              }
            }
          }
        }
        return substitutions;
      }
      function ligatureSubstitutionFormat1(contextParams, subtable) {
        let glyphIndex = contextParams.current;
        let ligSetIndex = lookupCoverage(glyphIndex, subtable.coverage);
        if (ligSetIndex === -1) return null;
        let ligature;
        let ligatureSet = subtable.ligatureSets[ligSetIndex];
        for (let s = 0; s < ligatureSet.length; s++) {
          ligature = ligatureSet[s];
          for (let l = 0; l < ligature.components.length; l++) {
            const lookaheadItem = contextParams.lookahead[l];
            const component = ligature.components[l];
            if (lookaheadItem !== component) break;
            if (l === ligature.components.length - 1) return ligature;
          }
        }
        return null;
      }
      function contextSubstitutionFormat1(contextParams, subtable) {
        let glyphId = contextParams.current;
        let ligSetIndex = lookupCoverage(glyphId, subtable.coverage);
        if (ligSetIndex === -1)
          return null;
        for (const ruleSet of subtable.ruleSets) {
          for (const rule of ruleSet) {
            let matched = true;
            for (let i = 0; i < rule.input.length; i++) {
              if (contextParams.lookahead[i] !== rule.input[i]) {
                matched = false;
                break;
              }
            }
            if (matched) {
              let substitutions = [];
              substitutions.push(glyphId);
              for (let i = 0; i < rule.input.length; i++) {
                substitutions.push(rule.input[i]);
              }
              const parser = (substitutions2, lookupRecord) => {
                const { lookupListIndex, sequenceIndex } = lookupRecord;
                const { subtables } = this.getLookupByIndex(lookupListIndex);
                for (const subtable2 of subtables) {
                  let ligSetIndex2 = lookupCoverage(substitutions2[sequenceIndex], subtable2.coverage);
                  if (ligSetIndex2 !== -1) {
                    substitutions2[sequenceIndex] = subtable2.deltaGlyphId;
                  }
                }
              };
              for (let i = 0; i < rule.lookupRecords.length; i++) {
                const lookupRecord = rule.lookupRecords[i];
                parser(substitutions, lookupRecord);
              }
              return substitutions;
            }
          }
        }
        return null;
      }
      function contextSubstitutionFormat3(contextParams, subtable) {
        if (contextParams.context.length < subtable.coverages.length) {
          return [];
        }
        for (let i = 0; i < subtable.coverages.length; i++) {
          let glyphIndex = contextParams.get(i);
          glyphIndex = Array.isArray(glyphIndex) ? glyphIndex[0] : glyphIndex;
          if (lookupCoverage(glyphIndex, subtable.coverages[i]) === -1) {
            return [];
          }
        }
        let substitutions = [];
        for (let i = 0; i < subtable.lookupRecords.length; i++) {
          const lookupRecord = subtable.lookupRecords[i];
          const lookupListIndex = lookupRecord.lookupListIndex;
          const lookupTable = this.getLookupByIndex(lookupListIndex);
          for (let s = 0; s < lookupTable.subtables.length; s++) {
            let subtable2 = lookupTable.subtables[s];
            let lookup;
            let substitutionType = this.getSubstitutionType(lookupTable, subtable2);
            if (substitutionType === "71") {
              substitutionType = this.getSubstitutionType(subtable2, subtable2.extension);
              lookup = this.getLookupMethod(subtable2, subtable2.extension);
              subtable2 = subtable2.extension;
            } else {
              lookup = this.getLookupMethod(lookupTable, subtable2);
            }
            if (substitutionType === "12") {
              const glyphIndex = contextParams.get(lookupRecord.sequenceIndex);
              const substitution = lookup(glyphIndex);
              if (substitution) substitutions.push(substitution);
            } else if (substitutionType === "21") {
              const glyphIndex = contextParams.get(lookupRecord.sequenceIndex);
              const substitution = lookup(glyphIndex);
              if (substitution) substitutions.push(substitution);
            }
          }
        }
        return substitutions;
      }
      function decompositionSubstitutionFormat1(glyphIndex, subtable) {
        let substituteIndex = lookupCoverage(glyphIndex, subtable.coverage);
        if (substituteIndex === -1) return null;
        return subtable.sequences[substituteIndex];
      }
      FeatureQuery.prototype.getDefaultScriptFeaturesIndexes = function() {
        const scripts = this.font.tables.gsub.scripts;
        for (let s = 0; s < scripts.length; s++) {
          const script = scripts[s];
          if (script.tag === "DFLT") return script.script.defaultLangSys.featureIndexes;
        }
        return [];
      };
      FeatureQuery.prototype.getScriptFeaturesIndexes = function(scriptTag) {
        const tables = this.font.tables;
        if (!tables.gsub) return [];
        if (!scriptTag) return this.getDefaultScriptFeaturesIndexes();
        const scripts = this.font.tables.gsub.scripts;
        for (let i = 0; i < scripts.length; i++) {
          const script = scripts[i];
          if (script.tag === scriptTag && script.script.defaultLangSys) {
            return script.script.defaultLangSys.featureIndexes;
          } else {
            let langSysRecords = script.langSysRecords;
            if (langSysRecords) {
              for (let j = 0; j < langSysRecords.length; j++) {
                const langSysRecord = langSysRecords[j];
                if (langSysRecord.tag === scriptTag) {
                  let langSys = langSysRecord.langSys;
                  return langSys.featureIndexes;
                }
              }
            }
          }
        }
        return this.getDefaultScriptFeaturesIndexes();
      };
      FeatureQuery.prototype.mapTagsToFeatures = function(features, scriptTag) {
        let tags = {};
        for (let i = 0; i < features.length; i++) {
          const tag = features[i].tag;
          const feature = features[i].feature;
          tags[tag] = feature;
        }
        this.features[scriptTag].tags = tags;
      };
      FeatureQuery.prototype.getScriptFeatures = function(scriptTag) {
        let features = this.features[scriptTag];
        if (Object.prototype.hasOwnProperty.call(this.features, scriptTag)) return features;
        const featuresIndexes = this.getScriptFeaturesIndexes(scriptTag);
        if (!featuresIndexes) return null;
        const gsub = this.font.tables.gsub;
        features = featuresIndexes.map((index) => gsub.features[index]);
        this.features[scriptTag] = features;
        this.mapTagsToFeatures(features, scriptTag);
        return features;
      };
      FeatureQuery.prototype.getSubstitutionType = function(lookupTable, subtable) {
        const lookupType = lookupTable.lookupType.toString();
        const substFormat = subtable.substFormat.toString();
        return lookupType + substFormat;
      };
      FeatureQuery.prototype.getLookupMethod = function(lookupTable, subtable) {
        let substitutionType = this.getSubstitutionType(lookupTable, subtable);
        switch (substitutionType) {
          case "11":
            return (glyphIndex) => singleSubstitutionFormat1.apply(
              this,
              [glyphIndex, subtable]
            );
          case "12":
            return (glyphIndex) => singleSubstitutionFormat2.apply(
              this,
              [glyphIndex, subtable]
            );
          case "63":
            return (contextParams) => chainingSubstitutionFormat3.apply(
              this,
              [contextParams, subtable]
            );
          case "41":
            return (contextParams) => ligatureSubstitutionFormat1.apply(
              this,
              [contextParams, subtable]
            );
          case "21":
            return (glyphIndex) => decompositionSubstitutionFormat1.apply(
              this,
              [glyphIndex, subtable]
            );
          case "51":
            return (contextParams) => contextSubstitutionFormat1.apply(
              this,
              [contextParams, subtable]
            );
          case "53":
            return (contextParams) => contextSubstitutionFormat3.apply(
              this,
              [contextParams, subtable]
            );
          default:
            throw new Error(
              `substitutionType : ${substitutionType} lookupType: ${lookupTable.lookupType} - substFormat: ${subtable.substFormat} is not yet supported`
            );
        }
      };
      FeatureQuery.prototype.lookupFeature = function(query) {
        let contextParams = query.contextParams;
        let currentIndex = contextParams.index;
        const feature = this.getFeature({
          tag: query.tag,
          script: query.script
        });
        if (!feature) return new Error(
          `font '${(this.font.names.unicode || this.font.names.windows || this.font.names.macintosh).fullName.en}' doesn't support feature '${query.tag}' for script '${query.script}'.`
        );
        const lookups = this.getFeatureLookups(feature);
        const substitutions = [].concat(contextParams.context);
        for (let l = 0; l < lookups.length; l++) {
          const lookupTable = lookups[l];
          const subtables = this.getLookupSubtables(lookupTable);
          for (let s = 0; s < subtables.length; s++) {
            let subtable = subtables[s];
            let substType = this.getSubstitutionType(lookupTable, subtable);
            let lookup;
            if (substType === "71") {
              substType = this.getSubstitutionType(subtable, subtable.extension);
              lookup = this.getLookupMethod(subtable, subtable.extension);
              subtable = subtable.extension;
            } else {
              lookup = this.getLookupMethod(lookupTable, subtable);
            }
            let substitution;
            switch (substType) {
              case "11":
                substitution = lookup(contextParams.current);
                if (substitution) {
                  substitutions.splice(currentIndex, 1, new SubstitutionAction({
                    id: 11,
                    tag: query.tag,
                    substitution
                  }));
                }
                break;
              case "12":
                substitution = lookup(contextParams.current);
                if (substitution) {
                  substitutions.splice(currentIndex, 1, new SubstitutionAction({
                    id: 12,
                    tag: query.tag,
                    substitution
                  }));
                }
                break;
              case "63":
                substitution = lookup(contextParams);
                if (Array.isArray(substitution) && substitution.length) {
                  substitutions.splice(currentIndex, 1, new SubstitutionAction({
                    id: 63,
                    tag: query.tag,
                    substitution
                  }));
                }
                break;
              case "41":
                substitution = lookup(contextParams);
                if (substitution) {
                  substitutions.splice(currentIndex, 1, new SubstitutionAction({
                    id: 41,
                    tag: query.tag,
                    substitution
                  }));
                }
                break;
              case "21":
                substitution = lookup(contextParams.current);
                if (substitution) {
                  substitutions.splice(currentIndex, 1, new SubstitutionAction({
                    id: 21,
                    tag: query.tag,
                    substitution
                  }));
                }
                break;
              case "51":
              case "53":
                substitution = lookup(contextParams);
                if (Array.isArray(substitution) && substitution.length) {
                  substitutions.splice(currentIndex, 1, new SubstitutionAction({
                    id: parseInt(substType),
                    tag: query.tag,
                    substitution
                  }));
                }
                break;
            }
            contextParams = new ContextParams(substitutions, currentIndex);
            if (Array.isArray(substitution) && !substitution.length) continue;
            substitution = null;
          }
        }
        return substitutions.length ? substitutions : null;
      };
      FeatureQuery.prototype.supports = function(query) {
        if (!query.script) return false;
        this.getScriptFeatures(query.script);
        const supportedScript = Object.prototype.hasOwnProperty.call(this.features, query.script);
        if (!query.tag) return supportedScript;
        const supportedFeature = this.features[query.script].some((feature) => feature.tag === query.tag);
        return supportedScript && supportedFeature;
      };
      FeatureQuery.prototype.getLookupSubtables = function(lookupTable) {
        return lookupTable.subtables || null;
      };
      FeatureQuery.prototype.getLookupByIndex = function(index) {
        const lookups = this.font.tables.gsub.lookups;
        return lookups[index] || null;
      };
      FeatureQuery.prototype.getFeatureLookups = function(feature) {
        return feature.lookupListIndexes.map(this.getLookupByIndex.bind(this));
      };
      FeatureQuery.prototype.getFeature = function getFeature(query) {
        if (!this.font) return { FAIL: "No font was found" };
        if (!Object.prototype.hasOwnProperty.call(this.features, query.script)) {
          this.getScriptFeatures(query.script);
        }
        const scriptFeatures = this.features[query.script];
        if (!scriptFeatures) return { FAIL: `No feature for script ${query.script}` };
        if (!scriptFeatures.tags[query.tag]) return null;
        return this.features[query.script].tags[query.tag];
      };
      var featureQuery_default = FeatureQuery;
      function arabicWordStartCheck(contextParams) {
        const char = contextParams.current;
        const prevChar = contextParams.get(-1);
        return (
          // ? arabic first char
          prevChar === null && isArabicChar(char) || // ? arabic char preceded with a non arabic char
          !isArabicChar(prevChar) && isArabicChar(char)
        );
      }
      function arabicWordEndCheck(contextParams) {
        const nextChar = contextParams.get(1);
        return (
          // ? last arabic char
          nextChar === null || // ? next char is not arabic
          !isArabicChar(nextChar)
        );
      }
      var arabicWord_default = {
        startCheck: arabicWordStartCheck,
        endCheck: arabicWordEndCheck
      };
      function arabicSentenceStartCheck(contextParams) {
        const char = contextParams.current;
        const prevChar = contextParams.get(-1);
        return (
          // ? an arabic char preceded with a non arabic char
          (isArabicChar(char) || isTashkeelArabicChar(char)) && !isArabicChar(prevChar)
        );
      }
      function arabicSentenceEndCheck(contextParams) {
        const nextChar = contextParams.get(1);
        switch (true) {
          case nextChar === null:
            return true;
          case (!isArabicChar(nextChar) && !isTashkeelArabicChar(nextChar)): {
            const nextIsWhitespace = isWhiteSpace(nextChar);
            if (!nextIsWhitespace) return true;
            if (nextIsWhitespace) {
              let arabicCharAhead = false;
              arabicCharAhead = contextParams.lookahead.some(
                (c) => isArabicChar(c) || isTashkeelArabicChar(c)
              );
              if (!arabicCharAhead) return true;
            }
            break;
          }
          default:
            return false;
        }
      }
      var arabicSentence_default = {
        startCheck: arabicSentenceStartCheck,
        endCheck: arabicSentenceEndCheck
      };
      function singleSubstitutionFormat12(action, tokens, index) {
        tokens[index].setState(action.tag, action.substitution);
      }
      function singleSubstitutionFormat22(action, tokens, index) {
        tokens[index].setState(action.tag, action.substitution);
      }
      function chainingSubstitutionFormat32(action, tokens, index) {
        for (let i = 0; i < action.substitution.length; i++) {
          const subst = action.substitution[i];
          const token = tokens[index + i];
          if (Array.isArray(subst)) {
            if (subst.length) {
              token.setState(action.tag, subst[0]);
            } else {
              token.setState("deleted", true);
            }
            continue;
          }
          token.setState(action.tag, subst);
        }
      }
      function ligatureSubstitutionFormat12(action, tokens, index) {
        let token = tokens[index];
        token.setState(action.tag, action.substitution.ligGlyph);
        const compsCount = action.substitution.components.length;
        for (let i = 0; i < compsCount; i++) {
          token = tokens[index + i + 1];
          token.setState("deleted", true);
        }
      }
      var SUBSTITUTIONS = {
        11: singleSubstitutionFormat12,
        12: singleSubstitutionFormat22,
        63: chainingSubstitutionFormat32,
        41: ligatureSubstitutionFormat12,
        51: chainingSubstitutionFormat32,
        53: chainingSubstitutionFormat32
      };
      function applySubstitution(action, tokens, index) {
        if (action instanceof SubstitutionAction && SUBSTITUTIONS[action.id]) {
          SUBSTITUTIONS[action.id](action, tokens, index);
        }
      }
      var applySubstitution_default = applySubstitution;
      function willConnectPrev(charContextParams) {
        let backtrack = [].concat(charContextParams.backtrack);
        for (let i = backtrack.length - 1; i >= 0; i--) {
          const prevChar = backtrack[i];
          const isolated = isIsolatedArabicChar(prevChar);
          const tashkeel = isTashkeelArabicChar(prevChar);
          if (!isolated && !tashkeel) return true;
          if (isolated) return false;
        }
        return false;
      }
      function willConnectNext(charContextParams) {
        if (isIsolatedArabicChar(charContextParams.current)) return false;
        for (let i = 0; i < charContextParams.lookahead.length; i++) {
          const nextChar = charContextParams.lookahead[i];
          const tashkeel = isTashkeelArabicChar(nextChar);
          if (!tashkeel) return true;
        }
        return false;
      }
      function arabicPresentationForms(range) {
        const script = "arab";
        const tags = this.featuresTags[script];
        const tokens = this.tokenizer.getRangeTokens(range);
        if (tokens.length === 1) return;
        let contextParams = new ContextParams(
          tokens.map(
            (token) => token.getState("glyphIndex")
          ),
          0
        );
        const charContextParams = new ContextParams(
          tokens.map(
            (token) => token.char
          ),
          0
        );
        for (let i = 0; i < tokens.length; i++) {
          const token = tokens[i];
          if (isTashkeelArabicChar(token.char)) continue;
          contextParams.setCurrentIndex(i);
          charContextParams.setCurrentIndex(i);
          let CONNECT = 0;
          if (willConnectPrev(charContextParams)) CONNECT |= 1;
          if (willConnectNext(charContextParams)) CONNECT |= 2;
          let tag;
          switch (CONNECT) {
            case 1:
              tag = "fina";
              break;
            case 2:
              tag = "init";
              break;
            case 3:
              tag = "medi";
              break;
          }
          if (tags.indexOf(tag) === -1) continue;
          let substitutions = this.query.lookupFeature({
            tag,
            script,
            contextParams
          });
          if (substitutions instanceof Error) {
            console.info(substitutions.message);
            continue;
          }
          for (let j = 0; j < substitutions.length; j++) {
            const action = substitutions[j];
            if (action instanceof SubstitutionAction) {
              applySubstitution_default(action, tokens, j);
              contextParams.context[j] = action.substitution;
            }
          }
        }
      }
      var arabicPresentationForms_default = arabicPresentationForms;
      function getContextParams(tokens, index) {
        const context = tokens.map((token) => token.activeState.value);
        return new ContextParams(context, index || 0);
      }
      function arabicRequiredLigatures(range) {
        const script = "arab";
        let tokens = this.tokenizer.getRangeTokens(range);
        let contextParams = getContextParams(tokens);
        for (let index = 0; index < contextParams.context.length; index++) {
          contextParams.setCurrentIndex(index);
          let substitutions = this.query.lookupFeature({
            tag: "rlig",
            script,
            contextParams
          });
          if (substitutions.length) {
            for (let i = 0; i < substitutions.length; i++) {
              const action = substitutions[i];
              applySubstitution_default(action, tokens, index);
            }
            contextParams = getContextParams(tokens);
          }
        }
      }
      var arabicRequiredLigatures_default = arabicRequiredLigatures;
      function ccmpReplacementStartCheck(contextParams) {
        return contextParams.index === 0 && contextParams.context.length > 1;
      }
      function ccmpReplacementEndCheck(contextParams) {
        return contextParams.index === contextParams.context.length - 1;
      }
      var ccmpReplacement_default = {
        startCheck: ccmpReplacementStartCheck,
        endCheck: ccmpReplacementEndCheck
      };
      function getContextParams2(tokens, index) {
        const context = tokens.map((token) => token.activeState.value);
        return new ContextParams(context, index || 0);
      }
      function ccmpReplacementLigatures(range) {
        const script = "delf";
        const tag = "ccmp";
        let tokens = this.tokenizer.getRangeTokens(range);
        let contextParams = getContextParams2(tokens);
        for (let index = 0; index < contextParams.context.length; index++) {
          if (!this.query.getFeature({ tag, script, contextParams })) {
            continue;
          }
          contextParams.setCurrentIndex(index);
          let substitutions = this.query.lookupFeature({
            tag,
            script,
            contextParams
          });
          if (substitutions.length) {
            for (let i = 0; i < substitutions.length; i++) {
              const action = substitutions[i];
              applySubstitution_default(action, tokens, index);
            }
            contextParams = getContextParams2(tokens);
          }
        }
      }
      var ccmpReplacementLigatures_default = ccmpReplacementLigatures;
      function latinWordStartCheck(contextParams) {
        const char = contextParams.current;
        const prevChar = contextParams.get(-1);
        return (
          // ? latin first char
          prevChar === null && isLatinChar(char) || // ? latin char preceded with a non latin char
          !isLatinChar(prevChar) && isLatinChar(char)
        );
      }
      function latinWordEndCheck(contextParams) {
        const nextChar = contextParams.get(1);
        return (
          // ? last latin char
          nextChar === null || // ? next char is not latin
          !isLatinChar(nextChar)
        );
      }
      var latinWord_default = {
        startCheck: latinWordStartCheck,
        endCheck: latinWordEndCheck
      };
      function getContextParams3(tokens, index) {
        const context = tokens.map((token) => token.activeState.value);
        return new ContextParams(context, index || 0);
      }
      function latinLigature(range) {
        const script = "latn";
        let tokens = this.tokenizer.getRangeTokens(range);
        let contextParams = getContextParams3(tokens);
        for (let index = 0; index < contextParams.context.length; index++) {
          contextParams.setCurrentIndex(index);
          let substitutions = this.query.lookupFeature({
            tag: "liga",
            script,
            contextParams
          });
          if (substitutions.length) {
            for (let i = 0; i < substitutions.length; i++) {
              const action = substitutions[i];
              applySubstitution_default(action, tokens, index);
            }
            contextParams = getContextParams3(tokens);
          }
        }
      }
      var latinLigatures_default = latinLigature;
      function thaiWordStartCheck(contextParams) {
        const char = contextParams.current;
        const prevChar = contextParams.get(-1);
        return (
          // ? thai first char
          prevChar === null && isThaiChar(char) || // ? thai char preceded with a non thai char
          !isThaiChar(prevChar) && isThaiChar(char)
        );
      }
      function thaiWordEndCheck(contextParams) {
        const nextChar = contextParams.get(1);
        return (
          // ? last thai char
          nextChar === null || // ? next char is not thai
          !isThaiChar(nextChar)
        );
      }
      var thaiWord_default = {
        startCheck: thaiWordStartCheck,
        endCheck: thaiWordEndCheck
      };
      function getContextParams4(tokens, index) {
        const context = tokens.map((token) => token.activeState.value);
        return new ContextParams(context, index || 0);
      }
      function thaiGlyphComposition(range) {
        const script = "thai";
        let tokens = this.tokenizer.getRangeTokens(range);
        let contextParams = getContextParams4(tokens, 0);
        for (let index = 0; index < contextParams.context.length; index++) {
          contextParams.setCurrentIndex(index);
          let substitutions = this.query.lookupFeature({
            tag: "ccmp",
            script,
            contextParams
          });
          if (substitutions.length) {
            for (let i = 0; i < substitutions.length; i++) {
              const action = substitutions[i];
              applySubstitution_default(action, tokens, index);
            }
            contextParams = getContextParams4(tokens, index);
          }
        }
      }
      var thaiGlyphComposition_default = thaiGlyphComposition;
      function getContextParams5(tokens, index) {
        const context = tokens.map((token) => token.activeState.value);
        return new ContextParams(context, index || 0);
      }
      function thaiLigatures(range) {
        const script = "thai";
        let tokens = this.tokenizer.getRangeTokens(range);
        let contextParams = getContextParams5(tokens, 0);
        for (let index = 0; index < contextParams.context.length; index++) {
          contextParams.setCurrentIndex(index);
          let substitutions = this.query.lookupFeature({
            tag: "liga",
            script,
            contextParams
          });
          if (substitutions.length) {
            for (let i = 0; i < substitutions.length; i++) {
              const action = substitutions[i];
              applySubstitution_default(action, tokens, index);
            }
            contextParams = getContextParams5(tokens, index);
          }
        }
      }
      var thaiLigatures_default = thaiLigatures;
      function getContextParams6(tokens, index) {
        const context = tokens.map((token) => token.activeState.value);
        return new ContextParams(context, index || 0);
      }
      function thaiRequiredLigatures(range) {
        const script = "thai";
        let tokens = this.tokenizer.getRangeTokens(range);
        let contextParams = getContextParams6(tokens, 0);
        for (let index = 0; index < contextParams.context.length; index++) {
          contextParams.setCurrentIndex(index);
          let substitutions = this.query.lookupFeature({
            tag: "rlig",
            script,
            contextParams
          });
          if (substitutions.length) {
            for (let i = 0; i < substitutions.length; i++) {
              const action = substitutions[i];
              applySubstitution_default(action, tokens, index);
            }
            contextParams = getContextParams6(tokens, index);
          }
        }
      }
      var thaiRequiredLigatures_default = thaiRequiredLigatures;
      function isVariationSequenceSelector(char) {
        if (char === null) return false;
        const charCode = char.codePointAt(0);
        return (
          // Mongolian Variation Selectors
          charCode >= 6155 && charCode <= 6157 || // Generic Variation Selectors
          charCode >= 65024 && charCode <= 65039 || // Ideographic Variation Sequences
          charCode >= 917760 && charCode <= 917999
        );
      }
      function unicodeVariationSequenceStartCheck(contextParams) {
        const char = contextParams.current;
        const nextChar = contextParams.get(1);
        return nextChar === null && isVariationSequenceSelector(char) || isVariationSequenceSelector(nextChar);
      }
      function unicodeVariationSequenceEndCheck(contextParams) {
        const nextChar = contextParams.get(1);
        return nextChar === null || !isVariationSequenceSelector(nextChar);
      }
      var variationSequenceCheck_default = {
        startCheck: unicodeVariationSequenceStartCheck,
        endCheck: unicodeVariationSequenceEndCheck
      };
      function unicodeVariationSequence(range) {
        const font = this.query.font;
        const tokens = this.tokenizer.getRangeTokens(range);
        tokens[1].setState("deleted", true);
        if (font.tables.cmap && font.tables.cmap.varSelectorList) {
          const baseCodePoint = tokens[0].char.codePointAt(0);
          const vsCodePoint = tokens[1].char.codePointAt(0);
          const selectorLookup = font.tables.cmap.varSelectorList[vsCodePoint];
          if (selectorLookup !== void 0) {
            if (selectorLookup.nonDefaultUVS) {
              const mappings = selectorLookup.nonDefaultUVS.uvsMappings;
              if (mappings[baseCodePoint]) {
                const replacementGlyphId = mappings[baseCodePoint].glyphID;
                if (font.glyphs.glyphs[replacementGlyphId] !== void 0) {
                  tokens[0].setState("glyphIndex", replacementGlyphId);
                }
              }
            }
          }
        }
      }
      var variationSequences_default = unicodeVariationSequence;
      function Bidi(baseDir) {
        this.baseDir = baseDir || "ltr";
        this.tokenizer = new tokenizer_default();
        this.featuresTags = {};
      }
      Bidi.prototype.setText = function(text) {
        this.text = text;
      };
      Bidi.prototype.contextChecks = {
        ccmpReplacementCheck: ccmpReplacement_default,
        latinWordCheck: latinWord_default,
        arabicWordCheck: arabicWord_default,
        arabicSentenceCheck: arabicSentence_default,
        thaiWordCheck: thaiWord_default,
        unicodeVariationSequenceCheck: variationSequenceCheck_default
      };
      function registerContextChecker(checkId) {
        const check = this.contextChecks[`${checkId}Check`];
        return this.tokenizer.registerContextChecker(
          checkId,
          check.startCheck,
          check.endCheck
        );
      }
      function tokenizeText() {
        registerContextChecker.call(this, "ccmpReplacement");
        registerContextChecker.call(this, "latinWord");
        registerContextChecker.call(this, "arabicWord");
        registerContextChecker.call(this, "arabicSentence");
        registerContextChecker.call(this, "thaiWord");
        registerContextChecker.call(this, "unicodeVariationSequence");
        return this.tokenizer.tokenize(this.text);
      }
      function reverseArabicSentences() {
        const ranges = this.tokenizer.getContextRanges("arabicSentence");
        for (let i = 0; i < ranges.length; i++) {
          const range = ranges[i];
          let rangeTokens = this.tokenizer.getRangeTokens(range);
          this.tokenizer.replaceRange(
            range.startIndex,
            range.endOffset,
            rangeTokens.reverse()
          );
        }
      }
      Bidi.prototype.registerFeatures = function(script, tags) {
        const supportedTags = tags.filter(
          (tag) => this.query.supports({ script, tag })
        );
        if (!Object.prototype.hasOwnProperty.call(this.featuresTags, script)) {
          this.featuresTags[script] = supportedTags;
        } else {
          this.featuresTags[script] = this.featuresTags[script].concat(supportedTags);
        }
      };
      Bidi.prototype.applyFeatures = function(font, features) {
        if (!font) throw new Error(
          "No valid font was provided to apply features"
        );
        if (!this.query) this.query = new featureQuery_default(font);
        for (let f2 = 0; f2 < features.length; f2++) {
          const feature = features[f2];
          if (!this.query.supports({ script: feature.script })) continue;
          this.registerFeatures(feature.script, feature.tags);
        }
      };
      Bidi.prototype.registerModifier = function(modifierId, condition, modifier) {
        this.tokenizer.registerModifier(modifierId, condition, modifier);
      };
      function checkGlyphIndexStatus() {
        if (this.tokenizer.registeredModifiers.indexOf("glyphIndex") === -1) {
          throw new Error(
            "glyphIndex modifier is required to apply arabic presentation features."
          );
        }
      }
      function applyArabicPresentationForms() {
        const script = "arab";
        if (!Object.prototype.hasOwnProperty.call(this.featuresTags, script)) return;
        checkGlyphIndexStatus.call(this);
        const ranges = this.tokenizer.getContextRanges("arabicWord");
        for (let i = 0; i < ranges.length; i++) {
          const range = ranges[i];
          arabicPresentationForms_default.call(this, range);
        }
      }
      function applyCcmpReplacement() {
        checkGlyphIndexStatus.call(this);
        const ranges = this.tokenizer.getContextRanges("ccmpReplacement");
        for (let i = 0; i < ranges.length; i++) {
          const range = ranges[i];
          ccmpReplacementLigatures_default.call(this, range);
        }
      }
      function applyArabicRequireLigatures() {
        if (!this.hasFeatureEnabled("arab", "rlig")) return;
        checkGlyphIndexStatus.call(this);
        const ranges = this.tokenizer.getContextRanges("arabicWord");
        for (let i = 0; i < ranges.length; i++) {
          const range = ranges[i];
          arabicRequiredLigatures_default.call(this, range);
        }
      }
      function applyLatinLigatures() {
        if (!this.hasFeatureEnabled("latn", "liga")) return;
        checkGlyphIndexStatus.call(this);
        const ranges = this.tokenizer.getContextRanges("latinWord");
        for (let i = 0; i < ranges.length; i++) {
          const range = ranges[i];
          latinLigatures_default.call(this, range);
        }
      }
      function applyUnicodeVariationSequences() {
        const ranges = this.tokenizer.getContextRanges("unicodeVariationSequence");
        for (let i = 0; i < ranges.length; i++) {
          const range = ranges[i];
          variationSequences_default.call(this, range);
        }
      }
      function applyThaiFeatures() {
        checkGlyphIndexStatus.call(this);
        const ranges = this.tokenizer.getContextRanges("thaiWord");
        for (let i = 0; i < ranges.length; i++) {
          const range = ranges[i];
          if (this.hasFeatureEnabled("thai", "liga")) thaiLigatures_default.call(this, range);
          if (this.hasFeatureEnabled("thai", "rlig")) thaiRequiredLigatures_default.call(this, range);
          if (this.hasFeatureEnabled("thai", "ccmp")) thaiGlyphComposition_default.call(this, range);
        }
      }
      Bidi.prototype.checkContextReady = function(contextId) {
        return !!this.tokenizer.getContext(contextId);
      };
      Bidi.prototype.applyFeaturesToContexts = function() {
        if (this.checkContextReady("ccmpReplacement")) {
          applyCcmpReplacement.call(this);
        }
        if (this.checkContextReady("arabicWord")) {
          applyArabicPresentationForms.call(this);
          applyArabicRequireLigatures.call(this);
        }
        if (this.checkContextReady("latinWord")) {
          applyLatinLigatures.call(this);
        }
        if (this.checkContextReady("arabicSentence")) {
          reverseArabicSentences.call(this);
        }
        if (this.checkContextReady("thaiWord")) {
          applyThaiFeatures.call(this);
        }
        if (this.checkContextReady("unicodeVariationSequence")) {
          applyUnicodeVariationSequences.call(this);
        }
      };
      Bidi.prototype.hasFeatureEnabled = function(script, tag) {
        return (this.featuresTags[script] || []).indexOf(tag) !== -1;
      };
      Bidi.prototype.processText = function(text) {
        if (!this.text || this.text !== text) {
          this.setText(text);
          tokenizeText.call(this);
          this.applyFeaturesToContexts();
        }
      };
      Bidi.prototype.getBidiText = function(text) {
        this.processText(text);
        return this.tokenizer.getText();
      };
      Bidi.prototype.getTextGlyphs = function(text) {
        this.processText(text);
        let indexes = [];
        for (let i = 0; i < this.tokenizer.tokens.length; i++) {
          const token = this.tokenizer.tokens[i];
          if (token.state.deleted) continue;
          const index = token.activeState.value;
          indexes.push(Array.isArray(index) ? index[0] : index);
        }
        return indexes;
      };
      var bidi_default = Bidi;
      function createDefaultNamesInfo(options) {
        return {
          fontFamily: { en: options.familyName || " " },
          fontSubfamily: { en: options.styleName || " " },
          fullName: { en: options.fullName || options.familyName + " " + options.styleName },
          // postScriptName may not contain any whitespace
          postScriptName: { en: options.postScriptName || (options.familyName + options.styleName).replace(/\s/g, "") },
          designer: { en: options.designer || " " },
          designerURL: { en: options.designerURL || " " },
          manufacturer: { en: options.manufacturer || " " },
          manufacturerURL: { en: options.manufacturerURL || " " },
          license: { en: options.license || " " },
          licenseURL: { en: options.licenseURL || " " },
          version: { en: options.version || "Version 0.1" },
          description: { en: options.description || " " },
          copyright: { en: options.copyright || " " },
          trademark: { en: options.trademark || " " }
        };
      }
      function Font(options) {
        options = options || {};
        options.tables = options.tables || {};
        if (!options.empty) {
          if (!options.familyName) throw new Error("When creating a new Font object, familyName is required.");
          if (!options.styleName) throw new Error("When creating a new Font object, styleName is required.");
          if (!options.unitsPerEm) throw new Error("When creating a new Font object, unitsPerEm is required.");
          if (!options.ascender) throw new Error("When creating a new Font object, ascender is required.");
          if (options.descender > 0) throw new Error("When creating a new Font object, negative descender value is required.");
          this.names = {};
          this.names.unicode = createDefaultNamesInfo(options);
          this.names.macintosh = createDefaultNamesInfo(options);
          this.names.windows = createDefaultNamesInfo(options);
          this.unitsPerEm = options.unitsPerEm || 1e3;
          this.ascender = options.ascender;
          this.descender = options.descender;
          this.createdTimestamp = options.createdTimestamp;
          this.italicAngle = options.italicAngle || 0;
          this.weightClass = options.weightClass || 0;
          let selection = 0;
          if (options.fsSelection) {
            selection = options.fsSelection;
          } else {
            if (this.italicAngle < 0) {
              selection |= this.fsSelectionValues.ITALIC;
            } else if (this.italicAngle > 0) {
              selection |= this.fsSelectionValues.OBLIQUE;
            }
            if (this.weightClass >= 600) {
              selection |= this.fsSelectionValues.BOLD;
            }
            if (selection === 0) {
              selection = this.fsSelectionValues.REGULAR;
            }
          }
          if (!options.panose || !Array.isArray(options.panose)) {
            options.panose = [0, 0, 0, 0, 0, 0, 0, 0, 0];
          }
          this.tables = Object.assign(options.tables, {
            os2: Object.assign({
              usWeightClass: options.weightClass || this.usWeightClasses.MEDIUM,
              usWidthClass: options.widthClass || this.usWidthClasses.MEDIUM,
              bFamilyType: options.panose[0] || 0,
              bSerifStyle: options.panose[1] || 0,
              bWeight: options.panose[2] || 0,
              bProportion: options.panose[3] || 0,
              bContrast: options.panose[4] || 0,
              bStrokeVariation: options.panose[5] || 0,
              bArmStyle: options.panose[6] || 0,
              bLetterform: options.panose[7] || 0,
              bMidline: options.panose[8] || 0,
              bXHeight: options.panose[9] || 0,
              fsSelection: selection
            }, options.tables.os2)
          });
        }
        this.supported = true;
        this.glyphs = new glyphset_default.GlyphSet(this, options.glyphs || []);
        this.encoding = new DefaultEncoding(this);
        this.position = new position_default(this);
        this.substitution = new substitution_default(this);
        this.tables = this.tables || {};
        this.tables = new Proxy(this.tables, {
          set: (tables, tableName, tableData) => {
            tables[tableName] = tableData;
            if (tables.fvar && (tables.gvar || tables.cff2) && !this.variation) {
              this.variation = new VariationManager(this);
            }
            return true;
          }
        });
        this.palettes = new PaletteManager(this);
        this.layers = new LayerManager(this);
        this.svgImages = new SVGImageManager(this);
        this._push = null;
        this._hmtxTableData = {};
        Object.defineProperty(this, "hinting", {
          get: function() {
            if (this._hinting) return this._hinting;
            if (this.outlinesFormat === "truetype") {
              return this._hinting = new hintingtt_default(this);
            }
            return null;
          }
        });
      }
      Font.prototype.hasChar = function(c) {
        return this.encoding.charToGlyphIndex(c) > 0;
      };
      Font.prototype.charToGlyphIndex = function(s) {
        return this.encoding.charToGlyphIndex(s);
      };
      Font.prototype.charToGlyph = function(c) {
        const glyphIndex = this.charToGlyphIndex(c);
        let glyph = this.glyphs.get(glyphIndex);
        if (!glyph) {
          glyph = this.glyphs.get(0);
        }
        return glyph;
      };
      Font.prototype.updateFeatures = function(options) {
        return this.defaultRenderOptions.features.map((feature) => {
          if (feature.script === "latn") {
            return {
              script: "latn",
              tags: feature.tags.filter((tag) => options[tag])
            };
          } else {
            return feature;
          }
        });
      };
      Font.prototype.stringToGlyphIndexes = function(s, options) {
        const bidi = new bidi_default();
        const charToGlyphIndexMod = (token) => this.charToGlyphIndex(token.char);
        bidi.registerModifier("glyphIndex", null, charToGlyphIndexMod);
        let features = options ? this.updateFeatures(options.features) : this.defaultRenderOptions.features;
        bidi.applyFeatures(this, features);
        return bidi.getTextGlyphs(s);
      };
      Font.prototype.stringToGlyphs = function(s, options) {
        const indexes = this.stringToGlyphIndexes(s, options);
        let length = indexes.length;
        const glyphs = new Array(length);
        const notdef = this.glyphs.get(0);
        for (let i = 0; i < length; i += 1) {
          glyphs[i] = this.glyphs.get(indexes[i]) || notdef;
        }
        return glyphs;
      };
      Font.prototype.nameToGlyphIndex = function(name) {
        return this.glyphNames.nameToGlyphIndex(name);
      };
      Font.prototype.nameToGlyph = function(name) {
        const glyphIndex = this.nameToGlyphIndex(name);
        let glyph = this.glyphs.get(glyphIndex);
        if (!glyph) {
          glyph = this.glyphs.get(0);
        }
        return glyph;
      };
      Font.prototype.glyphIndexToName = function(gid) {
        if (!this.glyphNames.glyphIndexToName) {
          return "";
        }
        return this.glyphNames.glyphIndexToName(gid);
      };
      Font.prototype.getKerningValue = function(leftGlyph, rightGlyph) {
        leftGlyph = leftGlyph.index || leftGlyph;
        rightGlyph = rightGlyph.index || rightGlyph;
        const gposKerning = this.position.defaultKerningTables;
        if (gposKerning) {
          return this.position.getKerningValue(gposKerning, leftGlyph, rightGlyph);
        }
        return this.kerningPairs[leftGlyph + "," + rightGlyph] || 0;
      };
      Font.prototype.defaultRenderOptions = {
        kerning: true,
        features: [
          /**
           * these 4 features are required to render Arabic text properly
           * and shouldn't be turned off when rendering arabic text.
           */
          { script: "arab", tags: ["init", "medi", "fina", "rlig"] },
          { script: "latn", tags: ["liga", "rlig"] },
          { script: "thai", tags: ["liga", "rlig", "ccmp"] }
        ],
        hinting: false,
        usePalette: 0,
        drawLayers: true,
        drawSVG: true
      };
      Font.prototype.forEachGlyph = function(text, x, y, fontSize, options, callback) {
        x = x !== void 0 ? x : 0;
        y = y !== void 0 ? y : 0;
        fontSize = fontSize !== void 0 ? fontSize : 72;
        options = Object.assign({}, this.defaultRenderOptions, options);
        const fontScale = 1 / this.unitsPerEm * fontSize;
        const glyphs = this.stringToGlyphs(text, options);
        let kerningLookups;
        if (options.kerning) {
          const script = options.script || this.position.getDefaultScriptName();
          kerningLookups = this.position.getKerningTables(script, options.language);
        }
        for (let i = 0; i < glyphs.length; i += 1) {
          const glyph = glyphs[i];
          callback.call(this, glyph, x, y, fontSize, options);
          if (glyph.advanceWidth) {
            x += glyph.advanceWidth * fontScale;
          }
          if (options.kerning && i < glyphs.length - 1) {
            const kerningValue = kerningLookups ? this.position.getKerningValue(kerningLookups, glyph.index, glyphs[i + 1].index) : this.getKerningValue(glyph, glyphs[i + 1]);
            x += kerningValue * fontScale;
          }
          if (options.letterSpacing) {
            x += options.letterSpacing * fontSize;
          } else if (options.tracking) {
            x += options.tracking / 1e3 * fontSize;
          }
        }
        return x;
      };
      Font.prototype.getPath = function(text, x, y, fontSize, options) {
        options = Object.assign({}, this.defaultRenderOptions, options);
        const fullPath = new path_default();
        fullPath._layers = [];
        applyPaintType(this, fullPath, fontSize);
        if (fullPath.stroke) {
          const scale = 1 / (fullPath.unitsPerEm || 1e3) * fontSize;
          fullPath.strokeWidth *= scale;
        }
        this.forEachGlyph(text, x, y, fontSize, options, (glyph, gX, gY, gFontSize) => {
          const glyphPath = glyph.getPath(gX, gY, gFontSize, options, this);
          if (options.drawSVG || options.drawLayers) {
            const layers = glyphPath._layers;
            if (layers && layers.length) {
              for (let l = 0; l < layers.length; l++) {
                const layer = layers[l];
                fullPath._layers.push(layer);
              }
              return;
            }
          }
          fullPath.extend(glyphPath);
        });
        return fullPath;
      };
      Font.prototype.getPaths = function(text, x, y, fontSize, options) {
        options = Object.assign({}, this.defaultRenderOptions, options);
        const glyphPaths = [];
        this.forEachGlyph(text, x, y, fontSize, options, function(glyph, gX, gY, gFontSize) {
          const glyphPath = glyph.getPath(gX, gY, gFontSize, options, this);
          glyphPaths.push(glyphPath);
        });
        return glyphPaths;
      };
      Font.prototype.getAdvanceWidth = function(text, fontSize, options) {
        options = Object.assign({}, this.defaultRenderOptions, options);
        return this.forEachGlyph(text, 0, 0, fontSize, options, function() {
        });
      };
      Font.prototype.draw = function(ctx, text, x, y, fontSize, options) {
        const path2 = this.getPath(text, x, y, fontSize, options);
        path2.draw(ctx);
      };
      Font.prototype.drawPoints = function(ctx, text, x, y, fontSize, options) {
        options = Object.assign({}, this.defaultRenderOptions, options);
        this.forEachGlyph(text, x, y, fontSize, options, function(glyph, gX, gY, gFontSize) {
          glyph.drawPoints(ctx, gX, gY, gFontSize, options, this);
        });
      };
      Font.prototype.drawMetrics = function(ctx, text, x, y, fontSize, options) {
        options = Object.assign({}, this.defaultRenderOptions, options);
        this.forEachGlyph(text, x, y, fontSize, options, function(glyph, gX, gY, gFontSize) {
          glyph.drawMetrics(ctx, gX, gY, gFontSize);
        });
      };
      Font.prototype.getEnglishName = function(name) {
        const translations = (this.names.unicode || this.names.macintosh || this.names.windows)[name];
        if (translations) {
          return translations.en;
        }
      };
      Font.prototype.validate = function() {
        const warnings = [];
        const _this = this;
        function assert(predicate, message) {
          if (!predicate) {
            console.warn(`[opentype.js] ${message}`);
            warnings.push(message);
          }
        }
        function assertNamePresent(name) {
          const englishName = _this.getEnglishName(name);
          assert(
            englishName && englishName.trim().length > 0,
            "No English " + name + " specified."
          );
        }
        assertNamePresent("fontFamily");
        assertNamePresent("weightName");
        assertNamePresent("manufacturer");
        assertNamePresent("copyright");
        assertNamePresent("version");
        assert(this.unitsPerEm > 0, "No unitsPerEm specified.");
        if (this.tables.colr) {
          const baseGlyphs = this.tables.colr.baseGlyphRecords;
          let previousID = -1;
          for (let b = 0; b < baseGlyphs.length; b++) {
            const currentGlyphID = baseGlyphs[b].glyphID;
            assert(previousID < baseGlyphs[b].glyphID, `baseGlyphs must be sorted by GlyphID in ascending order, but glyphID ${currentGlyphID} comes after ${previousID}`);
            if (previousID > baseGlyphs[b].glyphID) {
              break;
            }
            previousID = currentGlyphID;
          }
        }
        return warnings;
      };
      Font.prototype.toTables = function() {
        return sfnt_default.fontToTable(this);
      };
      Font.prototype.toBuffer = function() {
        console.warn("Font.toBuffer is deprecated. Use Font.toArrayBuffer instead.");
        return this.toArrayBuffer();
      };
      Font.prototype.toArrayBuffer = function() {
        const sfntTable = this.toTables();
        const bytes = sfntTable.encode();
        const buffer = new ArrayBuffer(bytes.length);
        const intArray = new Uint8Array(buffer);
        for (let i = 0; i < bytes.length; i++) {
          intArray[i] = bytes[i];
        }
        return buffer;
      };
      Font.prototype.download = function() {
        console.error("DEPRECATED: platform-specific actions are to be implemented on user-side");
      };
      Font.prototype.fsSelectionValues = {
        ITALIC: 1,
        //1
        UNDERSCORE: 2,
        //2
        NEGATIVE: 4,
        //4
        OUTLINED: 8,
        //8
        STRIKEOUT: 16,
        //16
        BOLD: 32,
        //32
        REGULAR: 64,
        //64
        USER_TYPO_METRICS: 128,
        //128
        WWS: 256,
        //256
        OBLIQUE: 512
        //512
      };
      Font.prototype.macStyleValues = {
        BOLD: 1,
        //1
        ITALIC: 2,
        //2
        UNDERLINE: 4,
        //4
        OUTLINED: 8,
        //8
        SHADOW: 16,
        //16
        CONDENSED: 32,
        //32
        EXTENDED: 64
        //64
      };
      Font.prototype.usWidthClasses = {
        ULTRA_CONDENSED: 1,
        EXTRA_CONDENSED: 2,
        CONDENSED: 3,
        SEMI_CONDENSED: 4,
        MEDIUM: 5,
        SEMI_EXPANDED: 6,
        EXPANDED: 7,
        EXTRA_EXPANDED: 8,
        ULTRA_EXPANDED: 9
      };
      Font.prototype.usWeightClasses = {
        THIN: 100,
        EXTRA_LIGHT: 200,
        LIGHT: 300,
        NORMAL: 400,
        MEDIUM: 500,
        SEMI_BOLD: 600,
        BOLD: 700,
        EXTRA_BOLD: 800,
        BLACK: 900
      };
      var font_default = Font;
      function parseHvarTable(data, start) {
        const p = new parse_default.Parser(data, start);
        const tableVersionMajor = p.parseUShort();
        const tableVersionMinor = p.parseUShort();
        if (tableVersionMajor !== 1) {
          console.warn(`Unsupported hvar table version ${tableVersionMajor}.${tableVersionMinor}`);
        }
        const version = [
          tableVersionMajor,
          tableVersionMinor
        ];
        const itemVariationStore = p.parsePointer32(function() {
          return this.parseItemVariationStore();
        });
        const advanceWidth = p.parsePointer32(function() {
          return this.parseDeltaSetIndexMap();
        });
        const lsb = p.parsePointer32(function() {
          return this.parseDeltaSetIndexMap();
        });
        const rsb = p.parsePointer32(function() {
          return this.parseDeltaSetIndexMap();
        });
        return {
          version,
          itemVariationStore,
          advanceWidth,
          lsb,
          rsb
        };
      }
      function makeHvarTable() {
        console.warn("Writing of hvar tables is not yet supported.");
      }
      var hvar_default = { make: makeHvarTable, parse: parseHvarTable };
      var attachList = function() {
        return {
          coverage: this.parsePointer(Parser.coverage),
          attachPoints: this.parseList(Parser.pointer(Parser.uShortList))
        };
      };
      var caretValue = function() {
        var format = this.parseUShort();
        check_default.argument(
          format === 1 || format === 2 || format === 3,
          "Unsupported CaretValue table version."
        );
        if (format === 1) {
          return { coordinate: this.parseShort() };
        } else if (format === 2) {
          return { pointindex: this.parseShort() };
        } else if (format === 3) {
          return { coordinate: this.parseShort() };
        }
      };
      var ligGlyph = function() {
        return this.parseList(Parser.pointer(caretValue));
      };
      var ligCaretList = function() {
        return {
          coverage: this.parsePointer(Parser.coverage),
          ligGlyphs: this.parseList(Parser.pointer(ligGlyph))
        };
      };
      var markGlyphSets = function() {
        this.parseUShort();
        return this.parseList(Parser.pointer(Parser.coverage));
      };
      function parseGDEFTable(data, start) {
        start = start || 0;
        const p = new Parser(data, start);
        const tableVersion = p.parseVersion(1);
        check_default.argument(
          tableVersion === 1 || tableVersion === 1.2 || tableVersion === 1.3,
          "Unsupported GDEF table version."
        );
        var gdef = {
          version: tableVersion,
          classDef: p.parsePointer(Parser.classDef),
          attachList: p.parsePointer(attachList),
          ligCaretList: p.parsePointer(ligCaretList),
          markAttachClassDef: p.parsePointer(Parser.classDef)
        };
        if (tableVersion >= 1.2) {
          gdef.markGlyphSets = p.parsePointer(markGlyphSets);
        }
        return gdef;
      }
      var gdef_default = { parse: parseGDEFTable };
      var subtableParsers2 = new Array(10);
      subtableParsers2[1] = function parseLookup12() {
        const start = this.offset + this.relativeOffset;
        const posformat = this.parseUShort();
        if (posformat === 1) {
          return {
            posFormat: 1,
            coverage: this.parsePointer(Parser.coverage),
            value: this.parseValueRecord()
          };
        } else if (posformat === 2) {
          return {
            posFormat: 2,
            coverage: this.parsePointer(Parser.coverage),
            values: this.parseValueRecordList()
          };
        }
        check_default.assert(false, "0x" + start.toString(16) + ": GPOS lookup type 1 format must be 1 or 2.");
      };
      subtableParsers2[2] = function parseLookup22() {
        const start = this.offset + this.relativeOffset;
        const posFormat = this.parseUShort();
        check_default.assert(posFormat === 1 || posFormat === 2, "0x" + start.toString(16) + ": GPOS lookup type 2 format must be 1 or 2.");
        const coverage = this.parsePointer(Parser.coverage);
        const valueFormat1 = this.parseUShort();
        const valueFormat2 = this.parseUShort();
        if (posFormat === 1) {
          return {
            posFormat,
            coverage,
            valueFormat1,
            valueFormat2,
            pairSets: this.parseList(Parser.pointer(Parser.list(function() {
              return {
                // pairValueRecord
                secondGlyph: this.parseUShort(),
                value1: this.parseValueRecord(valueFormat1),
                value2: this.parseValueRecord(valueFormat2)
              };
            })))
          };
        } else if (posFormat === 2) {
          const classDef1 = this.parsePointer(Parser.classDef);
          const classDef2 = this.parsePointer(Parser.classDef);
          const class1Count = this.parseUShort();
          const class2Count = this.parseUShort();
          return {
            // Class Pair Adjustment
            posFormat,
            coverage,
            valueFormat1,
            valueFormat2,
            classDef1,
            classDef2,
            class1Count,
            class2Count,
            classRecords: this.parseList(class1Count, Parser.list(class2Count, function() {
              return {
                value1: this.parseValueRecord(valueFormat1),
                value2: this.parseValueRecord(valueFormat2)
              };
            }))
          };
        }
      };
      subtableParsers2[3] = function parseLookup32() {
        return { error: "GPOS Lookup 3 not supported" };
      };
      subtableParsers2[4] = function parseLookup42() {
        return { error: "GPOS Lookup 4 not supported" };
      };
      subtableParsers2[5] = function parseLookup52() {
        return { error: "GPOS Lookup 5 not supported" };
      };
      subtableParsers2[6] = function parseLookup62() {
        return { error: "GPOS Lookup 6 not supported" };
      };
      subtableParsers2[7] = function parseLookup72() {
        return { error: "GPOS Lookup 7 not supported" };
      };
      subtableParsers2[8] = function parseLookup82() {
        return { error: "GPOS Lookup 8 not supported" };
      };
      subtableParsers2[9] = function parseLookup9() {
        return { error: "GPOS Lookup 9 not supported" };
      };
      function parseGposTable(data, start) {
        start = start || 0;
        const p = new Parser(data, start);
        const tableVersion = p.parseVersion(1);
        check_default.argument(tableVersion === 1 || tableVersion === 1.1, "Unsupported GPOS table version " + tableVersion);
        if (tableVersion === 1) {
          return {
            version: tableVersion,
            scripts: p.parseScriptList(),
            features: p.parseFeatureList(),
            lookups: p.parseLookupList(subtableParsers2)
          };
        } else {
          return {
            version: tableVersion,
            scripts: p.parseScriptList(),
            features: p.parseFeatureList(),
            lookups: p.parseLookupList(subtableParsers2),
            variations: p.parseFeatureVariationsList()
          };
        }
      }
      var subtableMakers2 = new Array(10);
      function makeGposTable(gpos) {
        return new table_default.Table("GPOS", [
          { name: "version", type: "ULONG", value: 65536 },
          { name: "scripts", type: "TABLE", value: new table_default.ScriptList(gpos.scripts) },
          { name: "features", type: "TABLE", value: new table_default.FeatureList(gpos.features) },
          { name: "lookups", type: "TABLE", value: new table_default.LookupList(gpos.lookups, subtableMakers2) }
        ]);
      }
      var gpos_default = { parse: parseGposTable, make: makeGposTable };
      function parseWindowsKernTable(p) {
        const pairs = {};
        p.skip("uShort");
        const subtableVersion = p.parseUShort();
        check_default.argument(subtableVersion === 0, "Unsupported kern sub-table version.");
        p.skip("uShort", 2);
        const nPairs = p.parseUShort();
        p.skip("uShort", 3);
        for (let i = 0; i < nPairs; i += 1) {
          const leftIndex = p.parseUShort();
          const rightIndex = p.parseUShort();
          const value = p.parseShort();
          pairs[leftIndex + "," + rightIndex] = value;
        }
        return pairs;
      }
      function parseMacKernTable(p) {
        const pairs = {};
        p.skip("uShort");
        const nTables = p.parseULong();
        if (nTables > 1) {
          console.warn("Only the first kern subtable is supported.");
        }
        p.skip("uLong");
        const coverage = p.parseUShort();
        const subtableVersion = coverage & 255;
        p.skip("uShort");
        if (subtableVersion === 0) {
          const nPairs = p.parseUShort();
          p.skip("uShort", 3);
          for (let i = 0; i < nPairs; i += 1) {
            const leftIndex = p.parseUShort();
            const rightIndex = p.parseUShort();
            const value = p.parseShort();
            pairs[leftIndex + "," + rightIndex] = value;
          }
        }
        return pairs;
      }
      function parseKernTable(data, start) {
        const p = new parse_default.Parser(data, start);
        const tableVersion = p.parseUShort();
        if (tableVersion === 0) {
          return parseWindowsKernTable(p);
        } else if (tableVersion === 1) {
          return parseMacKernTable(p);
        } else {
          throw new Error("Unsupported kern table version (" + tableVersion + ").");
        }
      }
      var kern_default = { parse: parseKernTable };
      function parseLocaTable(data, start, numGlyphs, shortVersion) {
        const p = new parse_default.Parser(data, start);
        const parseFn = shortVersion ? p.parseUShort : p.parseULong;
        const glyphOffsets = [];
        for (let i = 0; i < numGlyphs + 1; i += 1) {
          let glyphOffset = parseFn.call(p);
          if (shortVersion) {
            glyphOffset *= 2;
          }
          glyphOffsets.push(glyphOffset);
        }
        return glyphOffsets;
      }
      var loca_default = { parse: parseLocaTable };
      function parseOpenTypeTableEntries(data, numTables) {
        const tableEntries = [];
        let p = 12;
        for (let i = 0; i < numTables; i += 1) {
          const tag = parse_default.getTag(data, p);
          const checksum = parse_default.getULong(data, p + 4);
          const offset = parse_default.getULong(data, p + 8);
          const length = parse_default.getULong(data, p + 12);
          tableEntries.push({ tag, checksum, offset, length, compression: false });
          p += 16;
        }
        return tableEntries;
      }
      function parseWOFFTableEntries(data, numTables) {
        const tableEntries = [];
        let p = 44;
        for (let i = 0; i < numTables; i += 1) {
          const tag = parse_default.getTag(data, p);
          const offset = parse_default.getULong(data, p + 4);
          const compLength = parse_default.getULong(data, p + 8);
          const origLength = parse_default.getULong(data, p + 12);
          let compression;
          if (compLength < origLength) {
            compression = "WOFF";
          } else {
            compression = false;
          }
          tableEntries.push({
            tag,
            offset,
            compression,
            compressedLength: compLength,
            length: origLength
          });
          p += 20;
        }
        return tableEntries;
      }
      function uncompressTable(data, tableEntry) {
        if (tableEntry.compression === "WOFF") {
          const inBuffer = new Uint8Array(data.buffer, tableEntry.offset + 2, tableEntry.compressedLength - 2);
          const outBuffer = new Uint8Array(tableEntry.length);
          tinf_uncompress(inBuffer, outBuffer);
          if (outBuffer.byteLength !== tableEntry.length) {
            throw new Error("Decompression error: " + tableEntry.tag + " decompressed length doesn't match recorded length");
          }
          const view = new DataView(outBuffer.buffer, 0);
          return { data: view, offset: 0 };
        } else {
          return { data, offset: tableEntry.offset };
        }
      }
      function parseBuffer(buffer, opt = {}) {
        let indexToLocFormat;
        let ltagTable;
        const font = new font_default({ empty: true });
        if (buffer.constructor !== ArrayBuffer) {
          buffer = new Uint8Array(buffer).buffer;
        }
        const data = new DataView(buffer, 0);
        let numTables;
        let tableEntries = [];
        const signature = parse_default.getTag(data, 0);
        if (signature === String.fromCharCode(0, 1, 0, 0) || signature === "true" || signature === "typ1") {
          font.outlinesFormat = "truetype";
          numTables = parse_default.getUShort(data, 4);
          tableEntries = parseOpenTypeTableEntries(data, numTables);
        } else if (signature === "OTTO") {
          font.outlinesFormat = "cff";
          numTables = parse_default.getUShort(data, 4);
          tableEntries = parseOpenTypeTableEntries(data, numTables);
        } else if (signature === "wOFF") {
          const flavor = parse_default.getTag(data, 4);
          if (flavor === String.fromCharCode(0, 1, 0, 0)) {
            font.outlinesFormat = "truetype";
          } else if (flavor === "OTTO") {
            font.outlinesFormat = "cff";
          } else {
            throw new Error("Unsupported OpenType flavor " + signature);
          }
          numTables = parse_default.getUShort(data, 12);
          tableEntries = parseWOFFTableEntries(data, numTables);
        } else if (signature === "wOF2") {
          const issue = "https://github.com/opentypejs/opentype.js/issues/183#issuecomment-1147228025";
          throw new Error("WOFF2 require an external decompressor library, see examples at: " + issue);
        } else {
          throw new Error("Unsupported OpenType signature " + signature);
        }
        let cffTableEntry;
        let cff2TableEntry;
        let fvarTableEntry;
        let statTableEntry;
        let gvarTableEntry;
        let cvarTableEntry;
        let avarTableEntry;
        let glyfTableEntry;
        let gdefTableEntry;
        let gposTableEntry;
        let gsubTableEntry;
        let hmtxTableEntry;
        let hvarTableEntry;
        let kernTableEntry;
        let locaTableEntry;
        let nameTableEntry;
        let metaTableEntry;
        let p;
        for (let i = 0; i < numTables; i += 1) {
          const tableEntry = tableEntries[i];
          let table;
          switch (tableEntry.tag) {
            case "avar":
              avarTableEntry = tableEntry;
              break;
            case "cmap":
              table = uncompressTable(data, tableEntry);
              font.tables.cmap = cmap_default.parse(table.data, table.offset);
              font.encoding = new CmapEncoding(font.tables.cmap);
              break;
            case "cvt ":
              table = uncompressTable(data, tableEntry);
              p = new parse_default.Parser(table.data, table.offset);
              font.tables.cvt = p.parseShortList(tableEntry.length / 2);
              break;
            case "fvar":
              fvarTableEntry = tableEntry;
              break;
            case "STAT":
              statTableEntry = tableEntry;
              break;
            case "gvar":
              gvarTableEntry = tableEntry;
              break;
            case "cvar":
              cvarTableEntry = tableEntry;
              break;
            case "fpgm":
              table = uncompressTable(data, tableEntry);
              p = new parse_default.Parser(table.data, table.offset);
              font.tables.fpgm = p.parseByteList(tableEntry.length);
              break;
            case "head":
              table = uncompressTable(data, tableEntry);
              font.tables.head = head_default.parse(table.data, table.offset);
              font.unitsPerEm = font.tables.head.unitsPerEm;
              indexToLocFormat = font.tables.head.indexToLocFormat;
              break;
            case "hhea":
              table = uncompressTable(data, tableEntry);
              font.tables.hhea = hhea_default.parse(table.data, table.offset);
              font.ascender = font.tables.hhea.ascender;
              font.descender = font.tables.hhea.descender;
              font.numberOfHMetrics = font.tables.hhea.numberOfHMetrics;
              break;
            case "HVAR":
              hvarTableEntry = tableEntry;
              break;
            case "hmtx":
              hmtxTableEntry = tableEntry;
              break;
            case "ltag":
              table = uncompressTable(data, tableEntry);
              ltagTable = ltag_default.parse(table.data, table.offset);
              break;
            case "COLR":
              table = uncompressTable(data, tableEntry);
              font.tables.colr = colr_default.parse(table.data, table.offset);
              break;
            case "CPAL":
              table = uncompressTable(data, tableEntry);
              font.tables.cpal = cpal_default.parse(table.data, table.offset);
              break;
            case "maxp":
              table = uncompressTable(data, tableEntry);
              font.tables.maxp = maxp_default.parse(table.data, table.offset);
              font.numGlyphs = font.tables.maxp.numGlyphs;
              break;
            case "name":
              nameTableEntry = tableEntry;
              break;
            case "OS/2":
              table = uncompressTable(data, tableEntry);
              font.tables.os2 = os2_default.parse(table.data, table.offset);
              break;
            case "post":
              table = uncompressTable(data, tableEntry);
              font.tables.post = post_default.parse(table.data, table.offset);
              font.glyphNames = new GlyphNames(font.tables.post);
              break;
            case "prep":
              table = uncompressTable(data, tableEntry);
              p = new parse_default.Parser(table.data, table.offset);
              font.tables.prep = p.parseByteList(tableEntry.length);
              break;
            case "glyf":
              glyfTableEntry = tableEntry;
              break;
            case "loca":
              locaTableEntry = tableEntry;
              break;
            case "CFF ":
              cffTableEntry = tableEntry;
              break;
            case "CFF2":
              cff2TableEntry = tableEntry;
              break;
            case "kern":
              kernTableEntry = tableEntry;
              break;
            case "GDEF":
              gdefTableEntry = tableEntry;
              break;
            case "GPOS":
              gposTableEntry = tableEntry;
              break;
            case "GSUB":
              gsubTableEntry = tableEntry;
              break;
            case "meta":
              metaTableEntry = tableEntry;
              break;
            case "gasp":
              try {
                table = uncompressTable(data, tableEntry);
                font.tables.gasp = gasp_default.parse(table.data, table.offset);
              } catch (e) {
                console.warn("Failed to parse gasp table, skipping.");
                console.warn(e);
              }
              break;
            case "SVG ":
              table = uncompressTable(data, tableEntry);
              font.tables.svg = svg_default.parse(table.data, table.offset);
              break;
            default:
              break;
          }
        }
        const nameTable = uncompressTable(data, nameTableEntry);
        font.tables.name = name_default.parse(nameTable.data, nameTable.offset, ltagTable);
        font.names = font.tables.name;
        if (glyfTableEntry && locaTableEntry) {
          const shortVersion = indexToLocFormat === 0;
          const locaTable = uncompressTable(data, locaTableEntry);
          const locaOffsets = loca_default.parse(locaTable.data, locaTable.offset, font.numGlyphs, shortVersion);
          const glyfTable = uncompressTable(data, glyfTableEntry);
          font.glyphs = glyf_default.parse(glyfTable.data, glyfTable.offset, locaOffsets, font, opt);
        } else if (cffTableEntry) {
          const cffTable = uncompressTable(data, cffTableEntry);
          cff_default.parse(cffTable.data, cffTable.offset, font, opt);
        } else if (cff2TableEntry) {
          const cffTable2 = uncompressTable(data, cff2TableEntry);
          cff_default.parse(cffTable2.data, cffTable2.offset, font, opt);
        } else {
          throw new Error("Font doesn't contain TrueType, CFF or CFF2 outlines.");
        }
        const hmtxTable = uncompressTable(data, hmtxTableEntry);
        hmtx_default.parse(font, hmtxTable.data, hmtxTable.offset, font.numberOfHMetrics, font.numGlyphs, font.glyphs, opt);
        addGlyphNames(font, opt);
        if (kernTableEntry) {
          const kernTable = uncompressTable(data, kernTableEntry);
          font.kerningPairs = kern_default.parse(kernTable.data, kernTable.offset);
        } else {
          font.kerningPairs = {};
        }
        if (gdefTableEntry) {
          const gdefTable = uncompressTable(data, gdefTableEntry);
          font.tables.gdef = gdef_default.parse(gdefTable.data, gdefTable.offset);
        }
        if (gposTableEntry) {
          const gposTable = uncompressTable(data, gposTableEntry);
          font.tables.gpos = gpos_default.parse(gposTable.data, gposTable.offset);
          font.position.init();
        }
        if (gsubTableEntry) {
          const gsubTable = uncompressTable(data, gsubTableEntry);
          font.tables.gsub = gsub_default.parse(gsubTable.data, gsubTable.offset);
        }
        if (fvarTableEntry) {
          const fvarTable = uncompressTable(data, fvarTableEntry);
          font.tables.fvar = fvar_default.parse(fvarTable.data, fvarTable.offset, font.names);
        }
        if (statTableEntry) {
          const statTable = uncompressTable(data, statTableEntry);
          font.tables.stat = stat_default.parse(statTable.data, statTable.offset, font.tables.fvar);
        }
        if (gvarTableEntry) {
          if (!fvarTableEntry) {
            console.warn("This font provides a gvar table, but no fvar table, which is required for variable fonts.");
          }
          if (!glyfTableEntry) {
            console.warn("This font provides a gvar table, but no glyf table. Glyph variation only works with TrueType outlines.");
          }
          const gvarTable = uncompressTable(data, gvarTableEntry);
          font.tables.gvar = gvar_default.parse(gvarTable.data, gvarTable.offset, font.tables.fvar, font.glyphs);
        }
        if (cvarTableEntry) {
          if (!fvarTableEntry) {
            console.warn("This font provides a cvar table, but no fvar table, which is required for variable fonts.");
          }
          if (!font.tables.cvt) {
            console.warn("This font provides a cvar table, but no cvt table which could be made variable.");
          }
          if (!glyfTableEntry) {
            console.warn("This font provides a gvar table, but no glyf table. Glyph variation only works with TrueType outlines.");
          }
          const cvarTable = uncompressTable(data, cvarTableEntry);
          font.tables.cvar = cvar_default.parse(cvarTable.data, cvarTable.offset, font.tables.fvar, font.tables.cvt || []);
        }
        if (avarTableEntry) {
          if (!fvarTableEntry) {
            console.warn("This font provides an avar table, but no fvar table, which is required for variable fonts.");
          }
          const avarTable = uncompressTable(data, avarTableEntry);
          font.tables.avar = avar_default.parse(avarTable.data, avarTable.offset, font.tables.fvar);
        }
        if (hvarTableEntry) {
          if (!fvarTableEntry) {
            console.warn("This font provides an HVAR table, but no fvar table, which is required for variable fonts.");
          }
          if (!hmtxTableEntry) {
            console.warn("This font provides an HVAR table, but no hmtx table to vary.");
          }
          const hvarTable = uncompressTable(data, hvarTableEntry);
          font.tables.hvar = hvar_default.parse(hvarTable.data, hvarTable.offset, font.tables.fvar);
        }
        if (metaTableEntry) {
          const metaTable = uncompressTable(data, metaTableEntry);
          font.tables.meta = meta_default.parse(metaTable.data, metaTable.offset);
          font.metas = font.tables.meta;
        }
        font.palettes = new PaletteManager(font);
        return font;
      }
      function load() {
        console.error("DEPRECATED! migrate to: opentype.parse(buffer, opt) See: https://github.com/opentypejs/opentype.js/issues/675");
      }
      function loadSync() {
        console.error('DEPRECATED! migrate to: opentype.parse(require("fs").readFileSync(url), opt)');
      }
      return __toCommonJS(opentype_exports);
    })();
    (function(root, factory) {
      if (typeof define === "function" && define.amd) define(factory);
      else if (typeof module === "object" && module.exports) module.exports = factory();
      else root.opentype = factory();
    })(typeof self !== "undefined" ? self : exports, () => ({ ...opentype3, "default": opentype3 }));
  }
});

// ../../node_modules/.pnpm/clipper-lib@6.4.2/node_modules/clipper-lib/clipper.js
var require_clipper = __commonJS({
  "../../node_modules/.pnpm/clipper-lib@6.4.2/node_modules/clipper-lib/clipper.js"(exports, module) {
    (function() {
      "use strict";
      var ClipperLib2 = {};
      ClipperLib2.version = "6.4.2.2";
      ClipperLib2.use_lines = true;
      ClipperLib2.use_xyz = false;
      var isNode = false;
      if (typeof module !== "undefined" && module.exports) {
        module.exports = ClipperLib2;
        isNode = true;
      } else {
        if (typeof define === "function" && define.amd) {
          define(ClipperLib2);
        }
        if (typeof document !== "undefined") window.ClipperLib = ClipperLib2;
        else self["ClipperLib"] = ClipperLib2;
      }
      var navigator_appName;
      if (!isNode) {
        var nav = navigator.userAgent.toString().toLowerCase();
        navigator_appName = navigator.appName;
      } else {
        var nav = "chrome";
        navigator_appName = "Netscape";
      }
      var browser = {};
      if (nav.indexOf("chrome") != -1 && nav.indexOf("chromium") == -1) browser.chrome = 1;
      else browser.chrome = 0;
      if (nav.indexOf("chromium") != -1) browser.chromium = 1;
      else browser.chromium = 0;
      if (nav.indexOf("safari") != -1 && nav.indexOf("chrome") == -1 && nav.indexOf("chromium") == -1) browser.safari = 1;
      else browser.safari = 0;
      if (nav.indexOf("firefox") != -1) browser.firefox = 1;
      else browser.firefox = 0;
      if (nav.indexOf("firefox/17") != -1) browser.firefox17 = 1;
      else browser.firefox17 = 0;
      if (nav.indexOf("firefox/15") != -1) browser.firefox15 = 1;
      else browser.firefox15 = 0;
      if (nav.indexOf("firefox/3") != -1) browser.firefox3 = 1;
      else browser.firefox3 = 0;
      if (nav.indexOf("opera") != -1) browser.opera = 1;
      else browser.opera = 0;
      if (nav.indexOf("msie 10") != -1) browser.msie10 = 1;
      else browser.msie10 = 0;
      if (nav.indexOf("msie 9") != -1) browser.msie9 = 1;
      else browser.msie9 = 0;
      if (nav.indexOf("msie 8") != -1) browser.msie8 = 1;
      else browser.msie8 = 0;
      if (nav.indexOf("msie 7") != -1) browser.msie7 = 1;
      else browser.msie7 = 0;
      if (nav.indexOf("msie ") != -1) browser.msie = 1;
      else browser.msie = 0;
      ClipperLib2.biginteger_used = null;
      var dbits;
      var canary = 244837814094590;
      var j_lm = (canary & 16777215) == 15715070;
      function BigInteger(a, b, c) {
        ClipperLib2.biginteger_used = 1;
        if (a != null)
          if ("number" == typeof a && "undefined" == typeof b) this.fromInt(a);
          else if ("number" == typeof a) this.fromNumber(a, b, c);
          else if (b == null && "string" != typeof a) this.fromString(a, 256);
          else this.fromString(a, b);
      }
      function nbi() {
        return new BigInteger(null, void 0, void 0);
      }
      function am1(i, x, w, j, c, n) {
        while (--n >= 0) {
          var v = x * this[i++] + w[j] + c;
          c = Math.floor(v / 67108864);
          w[j++] = v & 67108863;
        }
        return c;
      }
      function am2(i, x, w, j, c, n) {
        var xl = x & 32767, xh = x >> 15;
        while (--n >= 0) {
          var l = this[i] & 32767;
          var h = this[i++] >> 15;
          var m = xh * l + h * xl;
          l = xl * l + ((m & 32767) << 15) + w[j] + (c & 1073741823);
          c = (l >>> 30) + (m >>> 15) + xh * h + (c >>> 30);
          w[j++] = l & 1073741823;
        }
        return c;
      }
      function am3(i, x, w, j, c, n) {
        var xl = x & 16383, xh = x >> 14;
        while (--n >= 0) {
          var l = this[i] & 16383;
          var h = this[i++] >> 14;
          var m = xh * l + h * xl;
          l = xl * l + ((m & 16383) << 14) + w[j] + c;
          c = (l >> 28) + (m >> 14) + xh * h;
          w[j++] = l & 268435455;
        }
        return c;
      }
      if (j_lm && navigator_appName == "Microsoft Internet Explorer") {
        BigInteger.prototype.am = am2;
        dbits = 30;
      } else if (j_lm && navigator_appName != "Netscape") {
        BigInteger.prototype.am = am1;
        dbits = 26;
      } else {
        BigInteger.prototype.am = am3;
        dbits = 28;
      }
      BigInteger.prototype.DB = dbits;
      BigInteger.prototype.DM = (1 << dbits) - 1;
      BigInteger.prototype.DV = 1 << dbits;
      var BI_FP = 52;
      BigInteger.prototype.FV = Math.pow(2, BI_FP);
      BigInteger.prototype.F1 = BI_FP - dbits;
      BigInteger.prototype.F2 = 2 * dbits - BI_FP;
      var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
      var BI_RC = new Array();
      var rr, vv;
      rr = "0".charCodeAt(0);
      for (vv = 0; vv <= 9; ++vv) BI_RC[rr++] = vv;
      rr = "a".charCodeAt(0);
      for (vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
      rr = "A".charCodeAt(0);
      for (vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
      function int2char(n) {
        return BI_RM.charAt(n);
      }
      function intAt(s, i) {
        var c = BI_RC[s.charCodeAt(i)];
        return c == null ? -1 : c;
      }
      function bnpCopyTo(r) {
        for (var i = this.t - 1; i >= 0; --i) r[i] = this[i];
        r.t = this.t;
        r.s = this.s;
      }
      function bnpFromInt(x) {
        this.t = 1;
        this.s = x < 0 ? -1 : 0;
        if (x > 0) this[0] = x;
        else if (x < -1) this[0] = x + this.DV;
        else this.t = 0;
      }
      function nbv(i) {
        var r = nbi();
        r.fromInt(i);
        return r;
      }
      function bnpFromString(s, b) {
        var k;
        if (b == 16) k = 4;
        else if (b == 8) k = 3;
        else if (b == 256) k = 8;
        else if (b == 2) k = 1;
        else if (b == 32) k = 5;
        else if (b == 4) k = 2;
        else {
          this.fromRadix(s, b);
          return;
        }
        this.t = 0;
        this.s = 0;
        var i = s.length, mi = false, sh = 0;
        while (--i >= 0) {
          var x = k == 8 ? s[i] & 255 : intAt(s, i);
          if (x < 0) {
            if (s.charAt(i) == "-") mi = true;
            continue;
          }
          mi = false;
          if (sh == 0)
            this[this.t++] = x;
          else if (sh + k > this.DB) {
            this[this.t - 1] |= (x & (1 << this.DB - sh) - 1) << sh;
            this[this.t++] = x >> this.DB - sh;
          } else
            this[this.t - 1] |= x << sh;
          sh += k;
          if (sh >= this.DB) sh -= this.DB;
        }
        if (k == 8 && (s[0] & 128) != 0) {
          this.s = -1;
          if (sh > 0) this[this.t - 1] |= (1 << this.DB - sh) - 1 << sh;
        }
        this.clamp();
        if (mi) BigInteger.ZERO.subTo(this, this);
      }
      function bnpClamp() {
        var c = this.s & this.DM;
        while (this.t > 0 && this[this.t - 1] == c) --this.t;
      }
      function bnToString(b) {
        if (this.s < 0) return "-" + this.negate().toString(b);
        var k;
        if (b == 16) k = 4;
        else if (b == 8) k = 3;
        else if (b == 2) k = 1;
        else if (b == 32) k = 5;
        else if (b == 4) k = 2;
        else return this.toRadix(b);
        var km = (1 << k) - 1, d, m = false, r = "", i = this.t;
        var p = this.DB - i * this.DB % k;
        if (i-- > 0) {
          if (p < this.DB && (d = this[i] >> p) > 0) {
            m = true;
            r = int2char(d);
          }
          while (i >= 0) {
            if (p < k) {
              d = (this[i] & (1 << p) - 1) << k - p;
              d |= this[--i] >> (p += this.DB - k);
            } else {
              d = this[i] >> (p -= k) & km;
              if (p <= 0) {
                p += this.DB;
                --i;
              }
            }
            if (d > 0) m = true;
            if (m) r += int2char(d);
          }
        }
        return m ? r : "0";
      }
      function bnNegate() {
        var r = nbi();
        BigInteger.ZERO.subTo(this, r);
        return r;
      }
      function bnAbs() {
        return this.s < 0 ? this.negate() : this;
      }
      function bnCompareTo(a) {
        var r = this.s - a.s;
        if (r != 0) return r;
        var i = this.t;
        r = i - a.t;
        if (r != 0) return this.s < 0 ? -r : r;
        while (--i >= 0)
          if ((r = this[i] - a[i]) != 0) return r;
        return 0;
      }
      function nbits(x) {
        var r = 1, t;
        if ((t = x >>> 16) != 0) {
          x = t;
          r += 16;
        }
        if ((t = x >> 8) != 0) {
          x = t;
          r += 8;
        }
        if ((t = x >> 4) != 0) {
          x = t;
          r += 4;
        }
        if ((t = x >> 2) != 0) {
          x = t;
          r += 2;
        }
        if ((t = x >> 1) != 0) {
          x = t;
          r += 1;
        }
        return r;
      }
      function bnBitLength() {
        if (this.t <= 0) return 0;
        return this.DB * (this.t - 1) + nbits(this[this.t - 1] ^ this.s & this.DM);
      }
      function bnpDLShiftTo(n, r) {
        var i;
        for (i = this.t - 1; i >= 0; --i) r[i + n] = this[i];
        for (i = n - 1; i >= 0; --i) r[i] = 0;
        r.t = this.t + n;
        r.s = this.s;
      }
      function bnpDRShiftTo(n, r) {
        for (var i = n; i < this.t; ++i) r[i - n] = this[i];
        r.t = Math.max(this.t - n, 0);
        r.s = this.s;
      }
      function bnpLShiftTo(n, r) {
        var bs = n % this.DB;
        var cbs = this.DB - bs;
        var bm = (1 << cbs) - 1;
        var ds = Math.floor(n / this.DB), c = this.s << bs & this.DM, i;
        for (i = this.t - 1; i >= 0; --i) {
          r[i + ds + 1] = this[i] >> cbs | c;
          c = (this[i] & bm) << bs;
        }
        for (i = ds - 1; i >= 0; --i) r[i] = 0;
        r[ds] = c;
        r.t = this.t + ds + 1;
        r.s = this.s;
        r.clamp();
      }
      function bnpRShiftTo(n, r) {
        r.s = this.s;
        var ds = Math.floor(n / this.DB);
        if (ds >= this.t) {
          r.t = 0;
          return;
        }
        var bs = n % this.DB;
        var cbs = this.DB - bs;
        var bm = (1 << bs) - 1;
        r[0] = this[ds] >> bs;
        for (var i = ds + 1; i < this.t; ++i) {
          r[i - ds - 1] |= (this[i] & bm) << cbs;
          r[i - ds] = this[i] >> bs;
        }
        if (bs > 0) r[this.t - ds - 1] |= (this.s & bm) << cbs;
        r.t = this.t - ds;
        r.clamp();
      }
      function bnpSubTo(a, r) {
        var i = 0, c = 0, m = Math.min(a.t, this.t);
        while (i < m) {
          c += this[i] - a[i];
          r[i++] = c & this.DM;
          c >>= this.DB;
        }
        if (a.t < this.t) {
          c -= a.s;
          while (i < this.t) {
            c += this[i];
            r[i++] = c & this.DM;
            c >>= this.DB;
          }
          c += this.s;
        } else {
          c += this.s;
          while (i < a.t) {
            c -= a[i];
            r[i++] = c & this.DM;
            c >>= this.DB;
          }
          c -= a.s;
        }
        r.s = c < 0 ? -1 : 0;
        if (c < -1) r[i++] = this.DV + c;
        else if (c > 0) r[i++] = c;
        r.t = i;
        r.clamp();
      }
      function bnpMultiplyTo(a, r) {
        var x = this.abs(), y = a.abs();
        var i = x.t;
        r.t = i + y.t;
        while (--i >= 0) r[i] = 0;
        for (i = 0; i < y.t; ++i) r[i + x.t] = x.am(0, y[i], r, i, 0, x.t);
        r.s = 0;
        r.clamp();
        if (this.s != a.s) BigInteger.ZERO.subTo(r, r);
      }
      function bnpSquareTo(r) {
        var x = this.abs();
        var i = r.t = 2 * x.t;
        while (--i >= 0) r[i] = 0;
        for (i = 0; i < x.t - 1; ++i) {
          var c = x.am(i, x[i], r, 2 * i, 0, 1);
          if ((r[i + x.t] += x.am(i + 1, 2 * x[i], r, 2 * i + 1, c, x.t - i - 1)) >= x.DV) {
            r[i + x.t] -= x.DV;
            r[i + x.t + 1] = 1;
          }
        }
        if (r.t > 0) r[r.t - 1] += x.am(i, x[i], r, 2 * i, 0, 1);
        r.s = 0;
        r.clamp();
      }
      function bnpDivRemTo(m, q, r) {
        var pm = m.abs();
        if (pm.t <= 0) return;
        var pt = this.abs();
        if (pt.t < pm.t) {
          if (q != null) q.fromInt(0);
          if (r != null) this.copyTo(r);
          return;
        }
        if (r == null) r = nbi();
        var y = nbi(), ts = this.s, ms = m.s;
        var nsh = this.DB - nbits(pm[pm.t - 1]);
        if (nsh > 0) {
          pm.lShiftTo(nsh, y);
          pt.lShiftTo(nsh, r);
        } else {
          pm.copyTo(y);
          pt.copyTo(r);
        }
        var ys = y.t;
        var y0 = y[ys - 1];
        if (y0 == 0) return;
        var yt = y0 * (1 << this.F1) + (ys > 1 ? y[ys - 2] >> this.F2 : 0);
        var d1 = this.FV / yt, d2 = (1 << this.F1) / yt, e = 1 << this.F2;
        var i = r.t, j = i - ys, t = q == null ? nbi() : q;
        y.dlShiftTo(j, t);
        if (r.compareTo(t) >= 0) {
          r[r.t++] = 1;
          r.subTo(t, r);
        }
        BigInteger.ONE.dlShiftTo(ys, t);
        t.subTo(y, y);
        while (y.t < ys) y[y.t++] = 0;
        while (--j >= 0) {
          var qd = r[--i] == y0 ? this.DM : Math.floor(r[i] * d1 + (r[i - 1] + e) * d2);
          if ((r[i] += y.am(0, qd, r, j, 0, ys)) < qd) {
            y.dlShiftTo(j, t);
            r.subTo(t, r);
            while (r[i] < --qd) r.subTo(t, r);
          }
        }
        if (q != null) {
          r.drShiftTo(ys, q);
          if (ts != ms) BigInteger.ZERO.subTo(q, q);
        }
        r.t = ys;
        r.clamp();
        if (nsh > 0) r.rShiftTo(nsh, r);
        if (ts < 0) BigInteger.ZERO.subTo(r, r);
      }
      function bnMod(a) {
        var r = nbi();
        this.abs().divRemTo(a, null, r);
        if (this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a.subTo(r, r);
        return r;
      }
      function Classic(m) {
        this.m = m;
      }
      function cConvert(x) {
        if (x.s < 0 || x.compareTo(this.m) >= 0) return x.mod(this.m);
        else return x;
      }
      function cRevert(x) {
        return x;
      }
      function cReduce(x) {
        x.divRemTo(this.m, null, x);
      }
      function cMulTo(x, y, r) {
        x.multiplyTo(y, r);
        this.reduce(r);
      }
      function cSqrTo(x, r) {
        x.squareTo(r);
        this.reduce(r);
      }
      Classic.prototype.convert = cConvert;
      Classic.prototype.revert = cRevert;
      Classic.prototype.reduce = cReduce;
      Classic.prototype.mulTo = cMulTo;
      Classic.prototype.sqrTo = cSqrTo;
      function bnpInvDigit() {
        if (this.t < 1) return 0;
        var x = this[0];
        if ((x & 1) == 0) return 0;
        var y = x & 3;
        y = y * (2 - (x & 15) * y) & 15;
        y = y * (2 - (x & 255) * y) & 255;
        y = y * (2 - ((x & 65535) * y & 65535)) & 65535;
        y = y * (2 - x * y % this.DV) % this.DV;
        return y > 0 ? this.DV - y : -y;
      }
      function Montgomery(m) {
        this.m = m;
        this.mp = m.invDigit();
        this.mpl = this.mp & 32767;
        this.mph = this.mp >> 15;
        this.um = (1 << m.DB - 15) - 1;
        this.mt2 = 2 * m.t;
      }
      function montConvert(x) {
        var r = nbi();
        x.abs().dlShiftTo(this.m.t, r);
        r.divRemTo(this.m, null, r);
        if (x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m.subTo(r, r);
        return r;
      }
      function montRevert(x) {
        var r = nbi();
        x.copyTo(r);
        this.reduce(r);
        return r;
      }
      function montReduce(x) {
        while (x.t <= this.mt2)
          x[x.t++] = 0;
        for (var i = 0; i < this.m.t; ++i) {
          var j = x[i] & 32767;
          var u0 = j * this.mpl + ((j * this.mph + (x[i] >> 15) * this.mpl & this.um) << 15) & x.DM;
          j = i + this.m.t;
          x[j] += this.m.am(0, u0, x, i, 0, this.m.t);
          while (x[j] >= x.DV) {
            x[j] -= x.DV;
            x[++j]++;
          }
        }
        x.clamp();
        x.drShiftTo(this.m.t, x);
        if (x.compareTo(this.m) >= 0) x.subTo(this.m, x);
      }
      function montSqrTo(x, r) {
        x.squareTo(r);
        this.reduce(r);
      }
      function montMulTo(x, y, r) {
        x.multiplyTo(y, r);
        this.reduce(r);
      }
      Montgomery.prototype.convert = montConvert;
      Montgomery.prototype.revert = montRevert;
      Montgomery.prototype.reduce = montReduce;
      Montgomery.prototype.mulTo = montMulTo;
      Montgomery.prototype.sqrTo = montSqrTo;
      function bnpIsEven() {
        return (this.t > 0 ? this[0] & 1 : this.s) == 0;
      }
      function bnpExp(e, z) {
        if (e > 4294967295 || e < 1) return BigInteger.ONE;
        var r = nbi(), r2 = nbi(), g = z.convert(this), i = nbits(e) - 1;
        g.copyTo(r);
        while (--i >= 0) {
          z.sqrTo(r, r2);
          if ((e & 1 << i) > 0) z.mulTo(r2, g, r);
          else {
            var t = r;
            r = r2;
            r2 = t;
          }
        }
        return z.revert(r);
      }
      function bnModPowInt(e, m) {
        var z;
        if (e < 256 || m.isEven()) z = new Classic(m);
        else z = new Montgomery(m);
        return this.exp(e, z);
      }
      BigInteger.prototype.copyTo = bnpCopyTo;
      BigInteger.prototype.fromInt = bnpFromInt;
      BigInteger.prototype.fromString = bnpFromString;
      BigInteger.prototype.clamp = bnpClamp;
      BigInteger.prototype.dlShiftTo = bnpDLShiftTo;
      BigInteger.prototype.drShiftTo = bnpDRShiftTo;
      BigInteger.prototype.lShiftTo = bnpLShiftTo;
      BigInteger.prototype.rShiftTo = bnpRShiftTo;
      BigInteger.prototype.subTo = bnpSubTo;
      BigInteger.prototype.multiplyTo = bnpMultiplyTo;
      BigInteger.prototype.squareTo = bnpSquareTo;
      BigInteger.prototype.divRemTo = bnpDivRemTo;
      BigInteger.prototype.invDigit = bnpInvDigit;
      BigInteger.prototype.isEven = bnpIsEven;
      BigInteger.prototype.exp = bnpExp;
      BigInteger.prototype.toString = bnToString;
      BigInteger.prototype.negate = bnNegate;
      BigInteger.prototype.abs = bnAbs;
      BigInteger.prototype.compareTo = bnCompareTo;
      BigInteger.prototype.bitLength = bnBitLength;
      BigInteger.prototype.mod = bnMod;
      BigInteger.prototype.modPowInt = bnModPowInt;
      BigInteger.ZERO = nbv(0);
      BigInteger.ONE = nbv(1);
      function bnClone() {
        var r = nbi();
        this.copyTo(r);
        return r;
      }
      function bnIntValue() {
        if (this.s < 0) {
          if (this.t == 1) return this[0] - this.DV;
          else if (this.t == 0) return -1;
        } else if (this.t == 1) return this[0];
        else if (this.t == 0) return 0;
        return (this[1] & (1 << 32 - this.DB) - 1) << this.DB | this[0];
      }
      function bnByteValue() {
        return this.t == 0 ? this.s : this[0] << 24 >> 24;
      }
      function bnShortValue() {
        return this.t == 0 ? this.s : this[0] << 16 >> 16;
      }
      function bnpChunkSize(r) {
        return Math.floor(Math.LN2 * this.DB / Math.log(r));
      }
      function bnSigNum() {
        if (this.s < 0) return -1;
        else if (this.t <= 0 || this.t == 1 && this[0] <= 0) return 0;
        else return 1;
      }
      function bnpToRadix(b) {
        if (b == null) b = 10;
        if (this.signum() == 0 || b < 2 || b > 36) return "0";
        var cs = this.chunkSize(b);
        var a = Math.pow(b, cs);
        var d = nbv(a), y = nbi(), z = nbi(), r = "";
        this.divRemTo(d, y, z);
        while (y.signum() > 0) {
          r = (a + z.intValue()).toString(b).substr(1) + r;
          y.divRemTo(d, y, z);
        }
        return z.intValue().toString(b) + r;
      }
      function bnpFromRadix(s, b) {
        this.fromInt(0);
        if (b == null) b = 10;
        var cs = this.chunkSize(b);
        var d = Math.pow(b, cs), mi = false, j = 0, w = 0;
        for (var i = 0; i < s.length; ++i) {
          var x = intAt(s, i);
          if (x < 0) {
            if (s.charAt(i) == "-" && this.signum() == 0) mi = true;
            continue;
          }
          w = b * w + x;
          if (++j >= cs) {
            this.dMultiply(d);
            this.dAddOffset(w, 0);
            j = 0;
            w = 0;
          }
        }
        if (j > 0) {
          this.dMultiply(Math.pow(b, j));
          this.dAddOffset(w, 0);
        }
        if (mi) BigInteger.ZERO.subTo(this, this);
      }
      function bnpFromNumber(a, b, c) {
        if ("number" == typeof b) {
          if (a < 2) this.fromInt(1);
          else {
            this.fromNumber(a, c);
            if (!this.testBit(a - 1))
              this.bitwiseTo(BigInteger.ONE.shiftLeft(a - 1), op_or, this);
            if (this.isEven()) this.dAddOffset(1, 0);
            while (!this.isProbablePrime(b)) {
              this.dAddOffset(2, 0);
              if (this.bitLength() > a) this.subTo(BigInteger.ONE.shiftLeft(a - 1), this);
            }
          }
        } else {
          var x = new Array(), t = a & 7;
          x.length = (a >> 3) + 1;
          b.nextBytes(x);
          if (t > 0) x[0] &= (1 << t) - 1;
          else x[0] = 0;
          this.fromString(x, 256);
        }
      }
      function bnToByteArray() {
        var i = this.t, r = new Array();
        r[0] = this.s;
        var p = this.DB - i * this.DB % 8, d, k = 0;
        if (i-- > 0) {
          if (p < this.DB && (d = this[i] >> p) != (this.s & this.DM) >> p)
            r[k++] = d | this.s << this.DB - p;
          while (i >= 0) {
            if (p < 8) {
              d = (this[i] & (1 << p) - 1) << 8 - p;
              d |= this[--i] >> (p += this.DB - 8);
            } else {
              d = this[i] >> (p -= 8) & 255;
              if (p <= 0) {
                p += this.DB;
                --i;
              }
            }
            if ((d & 128) != 0) d |= -256;
            if (k == 0 && (this.s & 128) != (d & 128)) ++k;
            if (k > 0 || d != this.s) r[k++] = d;
          }
        }
        return r;
      }
      function bnEquals(a) {
        return this.compareTo(a) == 0;
      }
      function bnMin(a) {
        return this.compareTo(a) < 0 ? this : a;
      }
      function bnMax(a) {
        return this.compareTo(a) > 0 ? this : a;
      }
      function bnpBitwiseTo(a, op, r) {
        var i, f2, m = Math.min(a.t, this.t);
        for (i = 0; i < m; ++i) r[i] = op(this[i], a[i]);
        if (a.t < this.t) {
          f2 = a.s & this.DM;
          for (i = m; i < this.t; ++i) r[i] = op(this[i], f2);
          r.t = this.t;
        } else {
          f2 = this.s & this.DM;
          for (i = m; i < a.t; ++i) r[i] = op(f2, a[i]);
          r.t = a.t;
        }
        r.s = op(this.s, a.s);
        r.clamp();
      }
      function op_and(x, y) {
        return x & y;
      }
      function bnAnd(a) {
        var r = nbi();
        this.bitwiseTo(a, op_and, r);
        return r;
      }
      function op_or(x, y) {
        return x | y;
      }
      function bnOr(a) {
        var r = nbi();
        this.bitwiseTo(a, op_or, r);
        return r;
      }
      function op_xor(x, y) {
        return x ^ y;
      }
      function bnXor(a) {
        var r = nbi();
        this.bitwiseTo(a, op_xor, r);
        return r;
      }
      function op_andnot(x, y) {
        return x & ~y;
      }
      function bnAndNot(a) {
        var r = nbi();
        this.bitwiseTo(a, op_andnot, r);
        return r;
      }
      function bnNot() {
        var r = nbi();
        for (var i = 0; i < this.t; ++i) r[i] = this.DM & ~this[i];
        r.t = this.t;
        r.s = ~this.s;
        return r;
      }
      function bnShiftLeft(n) {
        var r = nbi();
        if (n < 0) this.rShiftTo(-n, r);
        else this.lShiftTo(n, r);
        return r;
      }
      function bnShiftRight(n) {
        var r = nbi();
        if (n < 0) this.lShiftTo(-n, r);
        else this.rShiftTo(n, r);
        return r;
      }
      function lbit(x) {
        if (x == 0) return -1;
        var r = 0;
        if ((x & 65535) == 0) {
          x >>= 16;
          r += 16;
        }
        if ((x & 255) == 0) {
          x >>= 8;
          r += 8;
        }
        if ((x & 15) == 0) {
          x >>= 4;
          r += 4;
        }
        if ((x & 3) == 0) {
          x >>= 2;
          r += 2;
        }
        if ((x & 1) == 0) ++r;
        return r;
      }
      function bnGetLowestSetBit() {
        for (var i = 0; i < this.t; ++i)
          if (this[i] != 0) return i * this.DB + lbit(this[i]);
        if (this.s < 0) return this.t * this.DB;
        return -1;
      }
      function cbit(x) {
        var r = 0;
        while (x != 0) {
          x &= x - 1;
          ++r;
        }
        return r;
      }
      function bnBitCount() {
        var r = 0, x = this.s & this.DM;
        for (var i = 0; i < this.t; ++i) r += cbit(this[i] ^ x);
        return r;
      }
      function bnTestBit(n) {
        var j = Math.floor(n / this.DB);
        if (j >= this.t) return this.s != 0;
        return (this[j] & 1 << n % this.DB) != 0;
      }
      function bnpChangeBit(n, op) {
        var r = BigInteger.ONE.shiftLeft(n);
        this.bitwiseTo(r, op, r);
        return r;
      }
      function bnSetBit(n) {
        return this.changeBit(n, op_or);
      }
      function bnClearBit(n) {
        return this.changeBit(n, op_andnot);
      }
      function bnFlipBit(n) {
        return this.changeBit(n, op_xor);
      }
      function bnpAddTo(a, r) {
        var i = 0, c = 0, m = Math.min(a.t, this.t);
        while (i < m) {
          c += this[i] + a[i];
          r[i++] = c & this.DM;
          c >>= this.DB;
        }
        if (a.t < this.t) {
          c += a.s;
          while (i < this.t) {
            c += this[i];
            r[i++] = c & this.DM;
            c >>= this.DB;
          }
          c += this.s;
        } else {
          c += this.s;
          while (i < a.t) {
            c += a[i];
            r[i++] = c & this.DM;
            c >>= this.DB;
          }
          c += a.s;
        }
        r.s = c < 0 ? -1 : 0;
        if (c > 0) r[i++] = c;
        else if (c < -1) r[i++] = this.DV + c;
        r.t = i;
        r.clamp();
      }
      function bnAdd(a) {
        var r = nbi();
        this.addTo(a, r);
        return r;
      }
      function bnSubtract(a) {
        var r = nbi();
        this.subTo(a, r);
        return r;
      }
      function bnMultiply(a) {
        var r = nbi();
        this.multiplyTo(a, r);
        return r;
      }
      function bnSquare() {
        var r = nbi();
        this.squareTo(r);
        return r;
      }
      function bnDivide(a) {
        var r = nbi();
        this.divRemTo(a, r, null);
        return r;
      }
      function bnRemainder(a) {
        var r = nbi();
        this.divRemTo(a, null, r);
        return r;
      }
      function bnDivideAndRemainder(a) {
        var q = nbi(), r = nbi();
        this.divRemTo(a, q, r);
        return new Array(q, r);
      }
      function bnpDMultiply(n) {
        this[this.t] = this.am(0, n - 1, this, 0, 0, this.t);
        ++this.t;
        this.clamp();
      }
      function bnpDAddOffset(n, w) {
        if (n == 0) return;
        while (this.t <= w) this[this.t++] = 0;
        this[w] += n;
        while (this[w] >= this.DV) {
          this[w] -= this.DV;
          if (++w >= this.t) this[this.t++] = 0;
          ++this[w];
        }
      }
      function NullExp() {
      }
      function nNop(x) {
        return x;
      }
      function nMulTo(x, y, r) {
        x.multiplyTo(y, r);
      }
      function nSqrTo(x, r) {
        x.squareTo(r);
      }
      NullExp.prototype.convert = nNop;
      NullExp.prototype.revert = nNop;
      NullExp.prototype.mulTo = nMulTo;
      NullExp.prototype.sqrTo = nSqrTo;
      function bnPow(e) {
        return this.exp(e, new NullExp());
      }
      function bnpMultiplyLowerTo(a, n, r) {
        var i = Math.min(this.t + a.t, n);
        r.s = 0;
        r.t = i;
        while (i > 0) r[--i] = 0;
        var j;
        for (j = r.t - this.t; i < j; ++i) r[i + this.t] = this.am(0, a[i], r, i, 0, this.t);
        for (j = Math.min(a.t, n); i < j; ++i) this.am(0, a[i], r, i, 0, n - i);
        r.clamp();
      }
      function bnpMultiplyUpperTo(a, n, r) {
        --n;
        var i = r.t = this.t + a.t - n;
        r.s = 0;
        while (--i >= 0) r[i] = 0;
        for (i = Math.max(n - this.t, 0); i < a.t; ++i)
          r[this.t + i - n] = this.am(n - i, a[i], r, 0, 0, this.t + i - n);
        r.clamp();
        r.drShiftTo(1, r);
      }
      function Barrett(m) {
        this.r2 = nbi();
        this.q3 = nbi();
        BigInteger.ONE.dlShiftTo(2 * m.t, this.r2);
        this.mu = this.r2.divide(m);
        this.m = m;
      }
      function barrettConvert(x) {
        if (x.s < 0 || x.t > 2 * this.m.t) return x.mod(this.m);
        else if (x.compareTo(this.m) < 0) return x;
        else {
          var r = nbi();
          x.copyTo(r);
          this.reduce(r);
          return r;
        }
      }
      function barrettRevert(x) {
        return x;
      }
      function barrettReduce(x) {
        x.drShiftTo(this.m.t - 1, this.r2);
        if (x.t > this.m.t + 1) {
          x.t = this.m.t + 1;
          x.clamp();
        }
        this.mu.multiplyUpperTo(this.r2, this.m.t + 1, this.q3);
        this.m.multiplyLowerTo(this.q3, this.m.t + 1, this.r2);
        while (x.compareTo(this.r2) < 0) x.dAddOffset(1, this.m.t + 1);
        x.subTo(this.r2, x);
        while (x.compareTo(this.m) >= 0) x.subTo(this.m, x);
      }
      function barrettSqrTo(x, r) {
        x.squareTo(r);
        this.reduce(r);
      }
      function barrettMulTo(x, y, r) {
        x.multiplyTo(y, r);
        this.reduce(r);
      }
      Barrett.prototype.convert = barrettConvert;
      Barrett.prototype.revert = barrettRevert;
      Barrett.prototype.reduce = barrettReduce;
      Barrett.prototype.mulTo = barrettMulTo;
      Barrett.prototype.sqrTo = barrettSqrTo;
      function bnModPow(e, m) {
        var i = e.bitLength(), k, r = nbv(1), z;
        if (i <= 0) return r;
        else if (i < 18) k = 1;
        else if (i < 48) k = 3;
        else if (i < 144) k = 4;
        else if (i < 768) k = 5;
        else k = 6;
        if (i < 8)
          z = new Classic(m);
        else if (m.isEven())
          z = new Barrett(m);
        else
          z = new Montgomery(m);
        var g = new Array(), n = 3, k1 = k - 1, km = (1 << k) - 1;
        g[1] = z.convert(this);
        if (k > 1) {
          var g2 = nbi();
          z.sqrTo(g[1], g2);
          while (n <= km) {
            g[n] = nbi();
            z.mulTo(g2, g[n - 2], g[n]);
            n += 2;
          }
        }
        var j = e.t - 1, w, is1 = true, r2 = nbi(), t;
        i = nbits(e[j]) - 1;
        while (j >= 0) {
          if (i >= k1) w = e[j] >> i - k1 & km;
          else {
            w = (e[j] & (1 << i + 1) - 1) << k1 - i;
            if (j > 0) w |= e[j - 1] >> this.DB + i - k1;
          }
          n = k;
          while ((w & 1) == 0) {
            w >>= 1;
            --n;
          }
          if ((i -= n) < 0) {
            i += this.DB;
            --j;
          }
          if (is1) {
            g[w].copyTo(r);
            is1 = false;
          } else {
            while (n > 1) {
              z.sqrTo(r, r2);
              z.sqrTo(r2, r);
              n -= 2;
            }
            if (n > 0) z.sqrTo(r, r2);
            else {
              t = r;
              r = r2;
              r2 = t;
            }
            z.mulTo(r2, g[w], r);
          }
          while (j >= 0 && (e[j] & 1 << i) == 0) {
            z.sqrTo(r, r2);
            t = r;
            r = r2;
            r2 = t;
            if (--i < 0) {
              i = this.DB - 1;
              --j;
            }
          }
        }
        return z.revert(r);
      }
      function bnGCD(a) {
        var x = this.s < 0 ? this.negate() : this.clone();
        var y = a.s < 0 ? a.negate() : a.clone();
        if (x.compareTo(y) < 0) {
          var t = x;
          x = y;
          y = t;
        }
        var i = x.getLowestSetBit(), g = y.getLowestSetBit();
        if (g < 0) return x;
        if (i < g) g = i;
        if (g > 0) {
          x.rShiftTo(g, x);
          y.rShiftTo(g, y);
        }
        while (x.signum() > 0) {
          if ((i = x.getLowestSetBit()) > 0) x.rShiftTo(i, x);
          if ((i = y.getLowestSetBit()) > 0) y.rShiftTo(i, y);
          if (x.compareTo(y) >= 0) {
            x.subTo(y, x);
            x.rShiftTo(1, x);
          } else {
            y.subTo(x, y);
            y.rShiftTo(1, y);
          }
        }
        if (g > 0) y.lShiftTo(g, y);
        return y;
      }
      function bnpModInt(n) {
        if (n <= 0) return 0;
        var d = this.DV % n, r = this.s < 0 ? n - 1 : 0;
        if (this.t > 0)
          if (d == 0) r = this[0] % n;
          else
            for (var i = this.t - 1; i >= 0; --i) r = (d * r + this[i]) % n;
        return r;
      }
      function bnModInverse(m) {
        var ac = m.isEven();
        if (this.isEven() && ac || m.signum() == 0) return BigInteger.ZERO;
        var u = m.clone(), v = this.clone();
        var a = nbv(1), b = nbv(0), c = nbv(0), d = nbv(1);
        while (u.signum() != 0) {
          while (u.isEven()) {
            u.rShiftTo(1, u);
            if (ac) {
              if (!a.isEven() || !b.isEven()) {
                a.addTo(this, a);
                b.subTo(m, b);
              }
              a.rShiftTo(1, a);
            } else if (!b.isEven()) b.subTo(m, b);
            b.rShiftTo(1, b);
          }
          while (v.isEven()) {
            v.rShiftTo(1, v);
            if (ac) {
              if (!c.isEven() || !d.isEven()) {
                c.addTo(this, c);
                d.subTo(m, d);
              }
              c.rShiftTo(1, c);
            } else if (!d.isEven()) d.subTo(m, d);
            d.rShiftTo(1, d);
          }
          if (u.compareTo(v) >= 0) {
            u.subTo(v, u);
            if (ac) a.subTo(c, a);
            b.subTo(d, b);
          } else {
            v.subTo(u, v);
            if (ac) c.subTo(a, c);
            d.subTo(b, d);
          }
        }
        if (v.compareTo(BigInteger.ONE) != 0) return BigInteger.ZERO;
        if (d.compareTo(m) >= 0) return d.subtract(m);
        if (d.signum() < 0) d.addTo(m, d);
        else return d;
        if (d.signum() < 0) return d.add(m);
        else return d;
      }
      var lowprimes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271, 277, 281, 283, 293, 307, 311, 313, 317, 331, 337, 347, 349, 353, 359, 367, 373, 379, 383, 389, 397, 401, 409, 419, 421, 431, 433, 439, 443, 449, 457, 461, 463, 467, 479, 487, 491, 499, 503, 509, 521, 523, 541, 547, 557, 563, 569, 571, 577, 587, 593, 599, 601, 607, 613, 617, 619, 631, 641, 643, 647, 653, 659, 661, 673, 677, 683, 691, 701, 709, 719, 727, 733, 739, 743, 751, 757, 761, 769, 773, 787, 797, 809, 811, 821, 823, 827, 829, 839, 853, 857, 859, 863, 877, 881, 883, 887, 907, 911, 919, 929, 937, 941, 947, 953, 967, 971, 977, 983, 991, 997];
      var lplim = (1 << 26) / lowprimes[lowprimes.length - 1];
      function bnIsProbablePrime(t) {
        var i, x = this.abs();
        if (x.t == 1 && x[0] <= lowprimes[lowprimes.length - 1]) {
          for (i = 0; i < lowprimes.length; ++i)
            if (x[0] == lowprimes[i]) return true;
          return false;
        }
        if (x.isEven()) return false;
        i = 1;
        while (i < lowprimes.length) {
          var m = lowprimes[i], j = i + 1;
          while (j < lowprimes.length && m < lplim) m *= lowprimes[j++];
          m = x.modInt(m);
          while (i < j)
            if (m % lowprimes[i++] == 0) return false;
        }
        return x.millerRabin(t);
      }
      function bnpMillerRabin(t) {
        var n1 = this.subtract(BigInteger.ONE);
        var k = n1.getLowestSetBit();
        if (k <= 0) return false;
        var r = n1.shiftRight(k);
        t = t + 1 >> 1;
        if (t > lowprimes.length) t = lowprimes.length;
        var a = nbi();
        for (var i = 0; i < t; ++i) {
          a.fromInt(lowprimes[Math.floor(Math.random() * lowprimes.length)]);
          var y = a.modPow(r, this);
          if (y.compareTo(BigInteger.ONE) != 0 && y.compareTo(n1) != 0) {
            var j = 1;
            while (j++ < k && y.compareTo(n1) != 0) {
              y = y.modPowInt(2, this);
              if (y.compareTo(BigInteger.ONE) == 0) return false;
            }
            if (y.compareTo(n1) != 0) return false;
          }
        }
        return true;
      }
      BigInteger.prototype.chunkSize = bnpChunkSize;
      BigInteger.prototype.toRadix = bnpToRadix;
      BigInteger.prototype.fromRadix = bnpFromRadix;
      BigInteger.prototype.fromNumber = bnpFromNumber;
      BigInteger.prototype.bitwiseTo = bnpBitwiseTo;
      BigInteger.prototype.changeBit = bnpChangeBit;
      BigInteger.prototype.addTo = bnpAddTo;
      BigInteger.prototype.dMultiply = bnpDMultiply;
      BigInteger.prototype.dAddOffset = bnpDAddOffset;
      BigInteger.prototype.multiplyLowerTo = bnpMultiplyLowerTo;
      BigInteger.prototype.multiplyUpperTo = bnpMultiplyUpperTo;
      BigInteger.prototype.modInt = bnpModInt;
      BigInteger.prototype.millerRabin = bnpMillerRabin;
      BigInteger.prototype.clone = bnClone;
      BigInteger.prototype.intValue = bnIntValue;
      BigInteger.prototype.byteValue = bnByteValue;
      BigInteger.prototype.shortValue = bnShortValue;
      BigInteger.prototype.signum = bnSigNum;
      BigInteger.prototype.toByteArray = bnToByteArray;
      BigInteger.prototype.equals = bnEquals;
      BigInteger.prototype.min = bnMin;
      BigInteger.prototype.max = bnMax;
      BigInteger.prototype.and = bnAnd;
      BigInteger.prototype.or = bnOr;
      BigInteger.prototype.xor = bnXor;
      BigInteger.prototype.andNot = bnAndNot;
      BigInteger.prototype.not = bnNot;
      BigInteger.prototype.shiftLeft = bnShiftLeft;
      BigInteger.prototype.shiftRight = bnShiftRight;
      BigInteger.prototype.getLowestSetBit = bnGetLowestSetBit;
      BigInteger.prototype.bitCount = bnBitCount;
      BigInteger.prototype.testBit = bnTestBit;
      BigInteger.prototype.setBit = bnSetBit;
      BigInteger.prototype.clearBit = bnClearBit;
      BigInteger.prototype.flipBit = bnFlipBit;
      BigInteger.prototype.add = bnAdd;
      BigInteger.prototype.subtract = bnSubtract;
      BigInteger.prototype.multiply = bnMultiply;
      BigInteger.prototype.divide = bnDivide;
      BigInteger.prototype.remainder = bnRemainder;
      BigInteger.prototype.divideAndRemainder = bnDivideAndRemainder;
      BigInteger.prototype.modPow = bnModPow;
      BigInteger.prototype.modInverse = bnModInverse;
      BigInteger.prototype.pow = bnPow;
      BigInteger.prototype.gcd = bnGCD;
      BigInteger.prototype.isProbablePrime = bnIsProbablePrime;
      BigInteger.prototype.square = bnSquare;
      var Int128 = BigInteger;
      Int128.prototype.IsNegative = function() {
        if (this.compareTo(Int128.ZERO) == -1) return true;
        else return false;
      };
      Int128.op_Equality = function(val1, val2) {
        if (val1.compareTo(val2) == 0) return true;
        else return false;
      };
      Int128.op_Inequality = function(val1, val2) {
        if (val1.compareTo(val2) != 0) return true;
        else return false;
      };
      Int128.op_GreaterThan = function(val1, val2) {
        if (val1.compareTo(val2) > 0) return true;
        else return false;
      };
      Int128.op_LessThan = function(val1, val2) {
        if (val1.compareTo(val2) < 0) return true;
        else return false;
      };
      Int128.op_Addition = function(lhs, rhs) {
        return new Int128(lhs, void 0, void 0).add(new Int128(rhs, void 0, void 0));
      };
      Int128.op_Subtraction = function(lhs, rhs) {
        return new Int128(lhs, void 0, void 0).subtract(new Int128(rhs, void 0, void 0));
      };
      Int128.Int128Mul = function(lhs, rhs) {
        return new Int128(lhs, void 0, void 0).multiply(new Int128(rhs, void 0, void 0));
      };
      Int128.op_Division = function(lhs, rhs) {
        return lhs.divide(rhs);
      };
      Int128.prototype.ToDouble = function() {
        return parseFloat(this.toString());
      };
      var Inherit = function(ce, ce2) {
        var p;
        if (typeof Object.getOwnPropertyNames === "undefined") {
          for (p in ce2.prototype)
            if (typeof ce.prototype[p] === "undefined" || ce.prototype[p] === Object.prototype[p]) ce.prototype[p] = ce2.prototype[p];
          for (p in ce2)
            if (typeof ce[p] === "undefined") ce[p] = ce2[p];
          ce.$baseCtor = ce2;
        } else {
          var props = Object.getOwnPropertyNames(ce2.prototype);
          for (var i = 0; i < props.length; i++)
            if (typeof Object.getOwnPropertyDescriptor(ce.prototype, props[i]) === "undefined") Object.defineProperty(ce.prototype, props[i], Object.getOwnPropertyDescriptor(ce2.prototype, props[i]));
          for (p in ce2)
            if (typeof ce[p] === "undefined") ce[p] = ce2[p];
          ce.$baseCtor = ce2;
        }
      };
      ClipperLib2.Path = function() {
        return [];
      };
      ClipperLib2.Path.prototype.push = Array.prototype.push;
      ClipperLib2.Paths = function() {
        return [];
      };
      ClipperLib2.Paths.prototype.push = Array.prototype.push;
      ClipperLib2.DoublePoint = function() {
        var a = arguments;
        this.X = 0;
        this.Y = 0;
        if (a.length === 1) {
          this.X = a[0].X;
          this.Y = a[0].Y;
        } else if (a.length === 2) {
          this.X = a[0];
          this.Y = a[1];
        }
      };
      ClipperLib2.DoublePoint0 = function() {
        this.X = 0;
        this.Y = 0;
      };
      ClipperLib2.DoublePoint0.prototype = ClipperLib2.DoublePoint.prototype;
      ClipperLib2.DoublePoint1 = function(dp) {
        this.X = dp.X;
        this.Y = dp.Y;
      };
      ClipperLib2.DoublePoint1.prototype = ClipperLib2.DoublePoint.prototype;
      ClipperLib2.DoublePoint2 = function(x, y) {
        this.X = x;
        this.Y = y;
      };
      ClipperLib2.DoublePoint2.prototype = ClipperLib2.DoublePoint.prototype;
      ClipperLib2.PolyNode = function() {
        this.m_Parent = null;
        this.m_polygon = new ClipperLib2.Path();
        this.m_Index = 0;
        this.m_jointype = 0;
        this.m_endtype = 0;
        this.m_Childs = [];
        this.IsOpen = false;
      };
      ClipperLib2.PolyNode.prototype.IsHoleNode = function() {
        var result = true;
        var node = this.m_Parent;
        while (node !== null) {
          result = !result;
          node = node.m_Parent;
        }
        return result;
      };
      ClipperLib2.PolyNode.prototype.ChildCount = function() {
        return this.m_Childs.length;
      };
      ClipperLib2.PolyNode.prototype.Contour = function() {
        return this.m_polygon;
      };
      ClipperLib2.PolyNode.prototype.AddChild = function(Child) {
        var cnt = this.m_Childs.length;
        this.m_Childs.push(Child);
        Child.m_Parent = this;
        Child.m_Index = cnt;
      };
      ClipperLib2.PolyNode.prototype.GetNext = function() {
        if (this.m_Childs.length > 0)
          return this.m_Childs[0];
        else
          return this.GetNextSiblingUp();
      };
      ClipperLib2.PolyNode.prototype.GetNextSiblingUp = function() {
        if (this.m_Parent === null)
          return null;
        else if (this.m_Index === this.m_Parent.m_Childs.length - 1)
          return this.m_Parent.GetNextSiblingUp();
        else
          return this.m_Parent.m_Childs[this.m_Index + 1];
      };
      ClipperLib2.PolyNode.prototype.Childs = function() {
        return this.m_Childs;
      };
      ClipperLib2.PolyNode.prototype.Parent = function() {
        return this.m_Parent;
      };
      ClipperLib2.PolyNode.prototype.IsHole = function() {
        return this.IsHoleNode();
      };
      ClipperLib2.PolyTree = function() {
        this.m_AllPolys = [];
        ClipperLib2.PolyNode.call(this);
      };
      ClipperLib2.PolyTree.prototype.Clear = function() {
        for (var i = 0, ilen = this.m_AllPolys.length; i < ilen; i++)
          this.m_AllPolys[i] = null;
        this.m_AllPolys.length = 0;
        this.m_Childs.length = 0;
      };
      ClipperLib2.PolyTree.prototype.GetFirst = function() {
        if (this.m_Childs.length > 0)
          return this.m_Childs[0];
        else
          return null;
      };
      ClipperLib2.PolyTree.prototype.Total = function() {
        var result = this.m_AllPolys.length;
        if (result > 0 && this.m_Childs[0] !== this.m_AllPolys[0]) result--;
        return result;
      };
      Inherit(ClipperLib2.PolyTree, ClipperLib2.PolyNode);
      ClipperLib2.Math_Abs_Int64 = ClipperLib2.Math_Abs_Int32 = ClipperLib2.Math_Abs_Double = function(a) {
        return Math.abs(a);
      };
      ClipperLib2.Math_Max_Int32_Int32 = function(a, b) {
        return Math.max(a, b);
      };
      if (browser.msie || browser.opera || browser.safari) ClipperLib2.Cast_Int32 = function(a) {
        return a | 0;
      };
      else ClipperLib2.Cast_Int32 = function(a) {
        return ~~a;
      };
      if (typeof Number.toInteger === "undefined")
        Number.toInteger = null;
      if (browser.chrome) ClipperLib2.Cast_Int64 = function(a) {
        if (a < -2147483648 || a > 2147483647)
          return a < 0 ? Math.ceil(a) : Math.floor(a);
        else return ~~a;
      };
      else if (browser.firefox && typeof Number.toInteger === "function") ClipperLib2.Cast_Int64 = function(a) {
        return Number.toInteger(a);
      };
      else if (browser.msie7 || browser.msie8) ClipperLib2.Cast_Int64 = function(a) {
        return parseInt(a, 10);
      };
      else if (browser.msie) ClipperLib2.Cast_Int64 = function(a) {
        if (a < -2147483648 || a > 2147483647)
          return a < 0 ? Math.ceil(a) : Math.floor(a);
        return a | 0;
      };
      else ClipperLib2.Cast_Int64 = function(a) {
        return a < 0 ? Math.ceil(a) : Math.floor(a);
      };
      ClipperLib2.Clear = function(a) {
        a.length = 0;
      };
      ClipperLib2.PI = 3.141592653589793;
      ClipperLib2.PI2 = 2 * 3.141592653589793;
      ClipperLib2.IntPoint = function() {
        var a = arguments, alen = a.length;
        this.X = 0;
        this.Y = 0;
        if (ClipperLib2.use_xyz) {
          this.Z = 0;
          if (alen === 3) {
            this.X = a[0];
            this.Y = a[1];
            this.Z = a[2];
          } else if (alen === 2) {
            this.X = a[0];
            this.Y = a[1];
            this.Z = 0;
          } else if (alen === 1) {
            if (a[0] instanceof ClipperLib2.DoublePoint) {
              var dp = a[0];
              this.X = ClipperLib2.Clipper.Round(dp.X);
              this.Y = ClipperLib2.Clipper.Round(dp.Y);
              this.Z = 0;
            } else {
              var pt = a[0];
              if (typeof pt.Z === "undefined") pt.Z = 0;
              this.X = pt.X;
              this.Y = pt.Y;
              this.Z = pt.Z;
            }
          } else {
            this.X = 0;
            this.Y = 0;
            this.Z = 0;
          }
        } else {
          if (alen === 2) {
            this.X = a[0];
            this.Y = a[1];
          } else if (alen === 1) {
            if (a[0] instanceof ClipperLib2.DoublePoint) {
              var dp = a[0];
              this.X = ClipperLib2.Clipper.Round(dp.X);
              this.Y = ClipperLib2.Clipper.Round(dp.Y);
            } else {
              var pt = a[0];
              this.X = pt.X;
              this.Y = pt.Y;
            }
          } else {
            this.X = 0;
            this.Y = 0;
          }
        }
      };
      ClipperLib2.IntPoint.op_Equality = function(a, b) {
        return a.X === b.X && a.Y === b.Y;
      };
      ClipperLib2.IntPoint.op_Inequality = function(a, b) {
        return a.X !== b.X || a.Y !== b.Y;
      };
      ClipperLib2.IntPoint0 = function() {
        this.X = 0;
        this.Y = 0;
        if (ClipperLib2.use_xyz)
          this.Z = 0;
      };
      ClipperLib2.IntPoint0.prototype = ClipperLib2.IntPoint.prototype;
      ClipperLib2.IntPoint1 = function(pt) {
        this.X = pt.X;
        this.Y = pt.Y;
        if (ClipperLib2.use_xyz) {
          if (typeof pt.Z === "undefined") this.Z = 0;
          else this.Z = pt.Z;
        }
      };
      ClipperLib2.IntPoint1.prototype = ClipperLib2.IntPoint.prototype;
      ClipperLib2.IntPoint1dp = function(dp) {
        this.X = ClipperLib2.Clipper.Round(dp.X);
        this.Y = ClipperLib2.Clipper.Round(dp.Y);
        if (ClipperLib2.use_xyz)
          this.Z = 0;
      };
      ClipperLib2.IntPoint1dp.prototype = ClipperLib2.IntPoint.prototype;
      ClipperLib2.IntPoint2 = function(x, y, z) {
        this.X = x;
        this.Y = y;
        if (ClipperLib2.use_xyz) {
          if (typeof z === "undefined") this.Z = 0;
          else this.Z = z;
        }
      };
      ClipperLib2.IntPoint2.prototype = ClipperLib2.IntPoint.prototype;
      ClipperLib2.IntRect = function() {
        var a = arguments, alen = a.length;
        if (alen === 4) {
          this.left = a[0];
          this.top = a[1];
          this.right = a[2];
          this.bottom = a[3];
        } else if (alen === 1) {
          var ir = a[0];
          this.left = ir.left;
          this.top = ir.top;
          this.right = ir.right;
          this.bottom = ir.bottom;
        } else {
          this.left = 0;
          this.top = 0;
          this.right = 0;
          this.bottom = 0;
        }
      };
      ClipperLib2.IntRect0 = function() {
        this.left = 0;
        this.top = 0;
        this.right = 0;
        this.bottom = 0;
      };
      ClipperLib2.IntRect0.prototype = ClipperLib2.IntRect.prototype;
      ClipperLib2.IntRect1 = function(ir) {
        this.left = ir.left;
        this.top = ir.top;
        this.right = ir.right;
        this.bottom = ir.bottom;
      };
      ClipperLib2.IntRect1.prototype = ClipperLib2.IntRect.prototype;
      ClipperLib2.IntRect4 = function(l, t, r, b) {
        this.left = l;
        this.top = t;
        this.right = r;
        this.bottom = b;
      };
      ClipperLib2.IntRect4.prototype = ClipperLib2.IntRect.prototype;
      ClipperLib2.ClipType = {
        ctIntersection: 0,
        ctUnion: 1,
        ctDifference: 2,
        ctXor: 3
      };
      ClipperLib2.PolyType = {
        ptSubject: 0,
        ptClip: 1
      };
      ClipperLib2.PolyFillType = {
        pftEvenOdd: 0,
        pftNonZero: 1,
        pftPositive: 2,
        pftNegative: 3
      };
      ClipperLib2.JoinType = {
        jtSquare: 0,
        jtRound: 1,
        jtMiter: 2
      };
      ClipperLib2.EndType = {
        etOpenSquare: 0,
        etOpenRound: 1,
        etOpenButt: 2,
        etClosedLine: 3,
        etClosedPolygon: 4
      };
      ClipperLib2.EdgeSide = {
        esLeft: 0,
        esRight: 1
      };
      ClipperLib2.Direction = {
        dRightToLeft: 0,
        dLeftToRight: 1
      };
      ClipperLib2.TEdge = function() {
        this.Bot = new ClipperLib2.IntPoint0();
        this.Curr = new ClipperLib2.IntPoint0();
        this.Top = new ClipperLib2.IntPoint0();
        this.Delta = new ClipperLib2.IntPoint0();
        this.Dx = 0;
        this.PolyTyp = ClipperLib2.PolyType.ptSubject;
        this.Side = ClipperLib2.EdgeSide.esLeft;
        this.WindDelta = 0;
        this.WindCnt = 0;
        this.WindCnt2 = 0;
        this.OutIdx = 0;
        this.Next = null;
        this.Prev = null;
        this.NextInLML = null;
        this.NextInAEL = null;
        this.PrevInAEL = null;
        this.NextInSEL = null;
        this.PrevInSEL = null;
      };
      ClipperLib2.IntersectNode = function() {
        this.Edge1 = null;
        this.Edge2 = null;
        this.Pt = new ClipperLib2.IntPoint0();
      };
      ClipperLib2.MyIntersectNodeSort = function() {
      };
      ClipperLib2.MyIntersectNodeSort.Compare = function(node1, node2) {
        var i = node2.Pt.Y - node1.Pt.Y;
        if (i > 0) return 1;
        else if (i < 0) return -1;
        else return 0;
      };
      ClipperLib2.LocalMinima = function() {
        this.Y = 0;
        this.LeftBound = null;
        this.RightBound = null;
        this.Next = null;
      };
      ClipperLib2.Scanbeam = function() {
        this.Y = 0;
        this.Next = null;
      };
      ClipperLib2.Maxima = function() {
        this.X = 0;
        this.Next = null;
        this.Prev = null;
      };
      ClipperLib2.OutRec = function() {
        this.Idx = 0;
        this.IsHole = false;
        this.IsOpen = false;
        this.FirstLeft = null;
        this.Pts = null;
        this.BottomPt = null;
        this.PolyNode = null;
      };
      ClipperLib2.OutPt = function() {
        this.Idx = 0;
        this.Pt = new ClipperLib2.IntPoint0();
        this.Next = null;
        this.Prev = null;
      };
      ClipperLib2.Join = function() {
        this.OutPt1 = null;
        this.OutPt2 = null;
        this.OffPt = new ClipperLib2.IntPoint0();
      };
      ClipperLib2.ClipperBase = function() {
        this.m_MinimaList = null;
        this.m_CurrentLM = null;
        this.m_edges = new Array();
        this.m_UseFullRange = false;
        this.m_HasOpenPaths = false;
        this.PreserveCollinear = false;
        this.m_Scanbeam = null;
        this.m_PolyOuts = null;
        this.m_ActiveEdges = null;
      };
      ClipperLib2.ClipperBase.horizontal = -9007199254740992;
      ClipperLib2.ClipperBase.Skip = -2;
      ClipperLib2.ClipperBase.Unassigned = -1;
      ClipperLib2.ClipperBase.tolerance = 1e-20;
      ClipperLib2.ClipperBase.loRange = 47453132;
      ClipperLib2.ClipperBase.hiRange = 4503599627370495;
      ClipperLib2.ClipperBase.near_zero = function(val) {
        return val > -ClipperLib2.ClipperBase.tolerance && val < ClipperLib2.ClipperBase.tolerance;
      };
      ClipperLib2.ClipperBase.IsHorizontal = function(e) {
        return e.Delta.Y === 0;
      };
      ClipperLib2.ClipperBase.prototype.PointIsVertex = function(pt, pp) {
        var pp2 = pp;
        do {
          if (ClipperLib2.IntPoint.op_Equality(pp2.Pt, pt))
            return true;
          pp2 = pp2.Next;
        } while (pp2 !== pp);
        return false;
      };
      ClipperLib2.ClipperBase.prototype.PointOnLineSegment = function(pt, linePt1, linePt2, UseFullRange) {
        if (UseFullRange)
          return pt.X === linePt1.X && pt.Y === linePt1.Y || pt.X === linePt2.X && pt.Y === linePt2.Y || pt.X > linePt1.X === pt.X < linePt2.X && pt.Y > linePt1.Y === pt.Y < linePt2.Y && Int128.op_Equality(
            Int128.Int128Mul(pt.X - linePt1.X, linePt2.Y - linePt1.Y),
            Int128.Int128Mul(linePt2.X - linePt1.X, pt.Y - linePt1.Y)
          );
        else
          return pt.X === linePt1.X && pt.Y === linePt1.Y || pt.X === linePt2.X && pt.Y === linePt2.Y || pt.X > linePt1.X === pt.X < linePt2.X && pt.Y > linePt1.Y === pt.Y < linePt2.Y && (pt.X - linePt1.X) * (linePt2.Y - linePt1.Y) === (linePt2.X - linePt1.X) * (pt.Y - linePt1.Y);
      };
      ClipperLib2.ClipperBase.prototype.PointOnPolygon = function(pt, pp, UseFullRange) {
        var pp2 = pp;
        while (true) {
          if (this.PointOnLineSegment(pt, pp2.Pt, pp2.Next.Pt, UseFullRange))
            return true;
          pp2 = pp2.Next;
          if (pp2 === pp)
            break;
        }
        return false;
      };
      ClipperLib2.ClipperBase.prototype.SlopesEqual = ClipperLib2.ClipperBase.SlopesEqual = function() {
        var a = arguments, alen = a.length;
        var e1, e2, pt1, pt2, pt3, pt4, UseFullRange;
        if (alen === 3) {
          e1 = a[0];
          e2 = a[1];
          UseFullRange = a[2];
          if (UseFullRange)
            return Int128.op_Equality(Int128.Int128Mul(e1.Delta.Y, e2.Delta.X), Int128.Int128Mul(e1.Delta.X, e2.Delta.Y));
          else
            return ClipperLib2.Cast_Int64(e1.Delta.Y * e2.Delta.X) === ClipperLib2.Cast_Int64(e1.Delta.X * e2.Delta.Y);
        } else if (alen === 4) {
          pt1 = a[0];
          pt2 = a[1];
          pt3 = a[2];
          UseFullRange = a[3];
          if (UseFullRange)
            return Int128.op_Equality(Int128.Int128Mul(pt1.Y - pt2.Y, pt2.X - pt3.X), Int128.Int128Mul(pt1.X - pt2.X, pt2.Y - pt3.Y));
          else
            return ClipperLib2.Cast_Int64((pt1.Y - pt2.Y) * (pt2.X - pt3.X)) - ClipperLib2.Cast_Int64((pt1.X - pt2.X) * (pt2.Y - pt3.Y)) === 0;
        } else {
          pt1 = a[0];
          pt2 = a[1];
          pt3 = a[2];
          pt4 = a[3];
          UseFullRange = a[4];
          if (UseFullRange)
            return Int128.op_Equality(Int128.Int128Mul(pt1.Y - pt2.Y, pt3.X - pt4.X), Int128.Int128Mul(pt1.X - pt2.X, pt3.Y - pt4.Y));
          else
            return ClipperLib2.Cast_Int64((pt1.Y - pt2.Y) * (pt3.X - pt4.X)) - ClipperLib2.Cast_Int64((pt1.X - pt2.X) * (pt3.Y - pt4.Y)) === 0;
        }
      };
      ClipperLib2.ClipperBase.SlopesEqual3 = function(e1, e2, UseFullRange) {
        if (UseFullRange)
          return Int128.op_Equality(Int128.Int128Mul(e1.Delta.Y, e2.Delta.X), Int128.Int128Mul(e1.Delta.X, e2.Delta.Y));
        else
          return ClipperLib2.Cast_Int64(e1.Delta.Y * e2.Delta.X) === ClipperLib2.Cast_Int64(e1.Delta.X * e2.Delta.Y);
      };
      ClipperLib2.ClipperBase.SlopesEqual4 = function(pt1, pt2, pt3, UseFullRange) {
        if (UseFullRange)
          return Int128.op_Equality(Int128.Int128Mul(pt1.Y - pt2.Y, pt2.X - pt3.X), Int128.Int128Mul(pt1.X - pt2.X, pt2.Y - pt3.Y));
        else
          return ClipperLib2.Cast_Int64((pt1.Y - pt2.Y) * (pt2.X - pt3.X)) - ClipperLib2.Cast_Int64((pt1.X - pt2.X) * (pt2.Y - pt3.Y)) === 0;
      };
      ClipperLib2.ClipperBase.SlopesEqual5 = function(pt1, pt2, pt3, pt4, UseFullRange) {
        if (UseFullRange)
          return Int128.op_Equality(Int128.Int128Mul(pt1.Y - pt2.Y, pt3.X - pt4.X), Int128.Int128Mul(pt1.X - pt2.X, pt3.Y - pt4.Y));
        else
          return ClipperLib2.Cast_Int64((pt1.Y - pt2.Y) * (pt3.X - pt4.X)) - ClipperLib2.Cast_Int64((pt1.X - pt2.X) * (pt3.Y - pt4.Y)) === 0;
      };
      ClipperLib2.ClipperBase.prototype.Clear = function() {
        this.DisposeLocalMinimaList();
        for (var i = 0, ilen = this.m_edges.length; i < ilen; ++i) {
          for (var j = 0, jlen = this.m_edges[i].length; j < jlen; ++j)
            this.m_edges[i][j] = null;
          ClipperLib2.Clear(this.m_edges[i]);
        }
        ClipperLib2.Clear(this.m_edges);
        this.m_UseFullRange = false;
        this.m_HasOpenPaths = false;
      };
      ClipperLib2.ClipperBase.prototype.DisposeLocalMinimaList = function() {
        while (this.m_MinimaList !== null) {
          var tmpLm = this.m_MinimaList.Next;
          this.m_MinimaList = null;
          this.m_MinimaList = tmpLm;
        }
        this.m_CurrentLM = null;
      };
      ClipperLib2.ClipperBase.prototype.RangeTest = function(Pt, useFullRange) {
        if (useFullRange.Value) {
          if (Pt.X > ClipperLib2.ClipperBase.hiRange || Pt.Y > ClipperLib2.ClipperBase.hiRange || -Pt.X > ClipperLib2.ClipperBase.hiRange || -Pt.Y > ClipperLib2.ClipperBase.hiRange)
            ClipperLib2.Error("Coordinate outside allowed range in RangeTest().");
        } else if (Pt.X > ClipperLib2.ClipperBase.loRange || Pt.Y > ClipperLib2.ClipperBase.loRange || -Pt.X > ClipperLib2.ClipperBase.loRange || -Pt.Y > ClipperLib2.ClipperBase.loRange) {
          useFullRange.Value = true;
          this.RangeTest(Pt, useFullRange);
        }
      };
      ClipperLib2.ClipperBase.prototype.InitEdge = function(e, eNext, ePrev, pt) {
        e.Next = eNext;
        e.Prev = ePrev;
        e.Curr.X = pt.X;
        e.Curr.Y = pt.Y;
        if (ClipperLib2.use_xyz) e.Curr.Z = pt.Z;
        e.OutIdx = -1;
      };
      ClipperLib2.ClipperBase.prototype.InitEdge2 = function(e, polyType) {
        if (e.Curr.Y >= e.Next.Curr.Y) {
          e.Bot.X = e.Curr.X;
          e.Bot.Y = e.Curr.Y;
          if (ClipperLib2.use_xyz) e.Bot.Z = e.Curr.Z;
          e.Top.X = e.Next.Curr.X;
          e.Top.Y = e.Next.Curr.Y;
          if (ClipperLib2.use_xyz) e.Top.Z = e.Next.Curr.Z;
        } else {
          e.Top.X = e.Curr.X;
          e.Top.Y = e.Curr.Y;
          if (ClipperLib2.use_xyz) e.Top.Z = e.Curr.Z;
          e.Bot.X = e.Next.Curr.X;
          e.Bot.Y = e.Next.Curr.Y;
          if (ClipperLib2.use_xyz) e.Bot.Z = e.Next.Curr.Z;
        }
        this.SetDx(e);
        e.PolyTyp = polyType;
      };
      ClipperLib2.ClipperBase.prototype.FindNextLocMin = function(E) {
        var E2;
        for (; ; ) {
          while (ClipperLib2.IntPoint.op_Inequality(E.Bot, E.Prev.Bot) || ClipperLib2.IntPoint.op_Equality(E.Curr, E.Top))
            E = E.Next;
          if (E.Dx !== ClipperLib2.ClipperBase.horizontal && E.Prev.Dx !== ClipperLib2.ClipperBase.horizontal)
            break;
          while (E.Prev.Dx === ClipperLib2.ClipperBase.horizontal)
            E = E.Prev;
          E2 = E;
          while (E.Dx === ClipperLib2.ClipperBase.horizontal)
            E = E.Next;
          if (E.Top.Y === E.Prev.Bot.Y)
            continue;
          if (E2.Prev.Bot.X < E.Bot.X)
            E = E2;
          break;
        }
        return E;
      };
      ClipperLib2.ClipperBase.prototype.ProcessBound = function(E, LeftBoundIsForward) {
        var EStart;
        var Result = E;
        var Horz;
        if (Result.OutIdx === ClipperLib2.ClipperBase.Skip) {
          E = Result;
          if (LeftBoundIsForward) {
            while (E.Top.Y === E.Next.Bot.Y) E = E.Next;
            while (E !== Result && E.Dx === ClipperLib2.ClipperBase.horizontal) E = E.Prev;
          } else {
            while (E.Top.Y === E.Prev.Bot.Y) E = E.Prev;
            while (E !== Result && E.Dx === ClipperLib2.ClipperBase.horizontal) E = E.Next;
          }
          if (E === Result) {
            if (LeftBoundIsForward) Result = E.Next;
            else Result = E.Prev;
          } else {
            if (LeftBoundIsForward)
              E = Result.Next;
            else
              E = Result.Prev;
            var locMin = new ClipperLib2.LocalMinima();
            locMin.Next = null;
            locMin.Y = E.Bot.Y;
            locMin.LeftBound = null;
            locMin.RightBound = E;
            E.WindDelta = 0;
            Result = this.ProcessBound(E, LeftBoundIsForward);
            this.InsertLocalMinima(locMin);
          }
          return Result;
        }
        if (E.Dx === ClipperLib2.ClipperBase.horizontal) {
          if (LeftBoundIsForward) EStart = E.Prev;
          else EStart = E.Next;
          if (EStart.Dx === ClipperLib2.ClipperBase.horizontal) {
            if (EStart.Bot.X !== E.Bot.X && EStart.Top.X !== E.Bot.X)
              this.ReverseHorizontal(E);
          } else if (EStart.Bot.X !== E.Bot.X)
            this.ReverseHorizontal(E);
        }
        EStart = E;
        if (LeftBoundIsForward) {
          while (Result.Top.Y === Result.Next.Bot.Y && Result.Next.OutIdx !== ClipperLib2.ClipperBase.Skip)
            Result = Result.Next;
          if (Result.Dx === ClipperLib2.ClipperBase.horizontal && Result.Next.OutIdx !== ClipperLib2.ClipperBase.Skip) {
            Horz = Result;
            while (Horz.Prev.Dx === ClipperLib2.ClipperBase.horizontal)
              Horz = Horz.Prev;
            if (Horz.Prev.Top.X > Result.Next.Top.X)
              Result = Horz.Prev;
          }
          while (E !== Result) {
            E.NextInLML = E.Next;
            if (E.Dx === ClipperLib2.ClipperBase.horizontal && E !== EStart && E.Bot.X !== E.Prev.Top.X)
              this.ReverseHorizontal(E);
            E = E.Next;
          }
          if (E.Dx === ClipperLib2.ClipperBase.horizontal && E !== EStart && E.Bot.X !== E.Prev.Top.X)
            this.ReverseHorizontal(E);
          Result = Result.Next;
        } else {
          while (Result.Top.Y === Result.Prev.Bot.Y && Result.Prev.OutIdx !== ClipperLib2.ClipperBase.Skip)
            Result = Result.Prev;
          if (Result.Dx === ClipperLib2.ClipperBase.horizontal && Result.Prev.OutIdx !== ClipperLib2.ClipperBase.Skip) {
            Horz = Result;
            while (Horz.Next.Dx === ClipperLib2.ClipperBase.horizontal)
              Horz = Horz.Next;
            if (Horz.Next.Top.X === Result.Prev.Top.X || Horz.Next.Top.X > Result.Prev.Top.X) {
              Result = Horz.Next;
            }
          }
          while (E !== Result) {
            E.NextInLML = E.Prev;
            if (E.Dx === ClipperLib2.ClipperBase.horizontal && E !== EStart && E.Bot.X !== E.Next.Top.X)
              this.ReverseHorizontal(E);
            E = E.Prev;
          }
          if (E.Dx === ClipperLib2.ClipperBase.horizontal && E !== EStart && E.Bot.X !== E.Next.Top.X)
            this.ReverseHorizontal(E);
          Result = Result.Prev;
        }
        return Result;
      };
      ClipperLib2.ClipperBase.prototype.AddPath = function(pg, polyType, Closed) {
        if (ClipperLib2.use_lines) {
          if (!Closed && polyType === ClipperLib2.PolyType.ptClip)
            ClipperLib2.Error("AddPath: Open paths must be subject.");
        } else {
          if (!Closed)
            ClipperLib2.Error("AddPath: Open paths have been disabled.");
        }
        var highI = pg.length - 1;
        if (Closed)
          while (highI > 0 && ClipperLib2.IntPoint.op_Equality(pg[highI], pg[0]))
            --highI;
        while (highI > 0 && ClipperLib2.IntPoint.op_Equality(pg[highI], pg[highI - 1]))
          --highI;
        if (Closed && highI < 2 || !Closed && highI < 1)
          return false;
        var edges = new Array();
        for (var i = 0; i <= highI; i++)
          edges.push(new ClipperLib2.TEdge());
        var IsFlat = true;
        edges[1].Curr.X = pg[1].X;
        edges[1].Curr.Y = pg[1].Y;
        if (ClipperLib2.use_xyz) edges[1].Curr.Z = pg[1].Z;
        var $1 = {
          Value: this.m_UseFullRange
        };
        this.RangeTest(pg[0], $1);
        this.m_UseFullRange = $1.Value;
        $1.Value = this.m_UseFullRange;
        this.RangeTest(pg[highI], $1);
        this.m_UseFullRange = $1.Value;
        this.InitEdge(edges[0], edges[1], edges[highI], pg[0]);
        this.InitEdge(edges[highI], edges[0], edges[highI - 1], pg[highI]);
        for (var i = highI - 1; i >= 1; --i) {
          $1.Value = this.m_UseFullRange;
          this.RangeTest(pg[i], $1);
          this.m_UseFullRange = $1.Value;
          this.InitEdge(edges[i], edges[i + 1], edges[i - 1], pg[i]);
        }
        var eStart = edges[0];
        var E = eStart, eLoopStop = eStart;
        for (; ; ) {
          if (E.Curr === E.Next.Curr && (Closed || E.Next !== eStart)) {
            if (E === E.Next)
              break;
            if (E === eStart)
              eStart = E.Next;
            E = this.RemoveEdge(E);
            eLoopStop = E;
            continue;
          }
          if (E.Prev === E.Next)
            break;
          else if (Closed && ClipperLib2.ClipperBase.SlopesEqual4(E.Prev.Curr, E.Curr, E.Next.Curr, this.m_UseFullRange) && (!this.PreserveCollinear || !this.Pt2IsBetweenPt1AndPt3(E.Prev.Curr, E.Curr, E.Next.Curr))) {
            if (E === eStart)
              eStart = E.Next;
            E = this.RemoveEdge(E);
            E = E.Prev;
            eLoopStop = E;
            continue;
          }
          E = E.Next;
          if (E === eLoopStop || !Closed && E.Next === eStart) break;
        }
        if (!Closed && E === E.Next || Closed && E.Prev === E.Next)
          return false;
        if (!Closed) {
          this.m_HasOpenPaths = true;
          eStart.Prev.OutIdx = ClipperLib2.ClipperBase.Skip;
        }
        E = eStart;
        do {
          this.InitEdge2(E, polyType);
          E = E.Next;
          if (IsFlat && E.Curr.Y !== eStart.Curr.Y)
            IsFlat = false;
        } while (E !== eStart);
        if (IsFlat) {
          if (Closed)
            return false;
          E.Prev.OutIdx = ClipperLib2.ClipperBase.Skip;
          var locMin = new ClipperLib2.LocalMinima();
          locMin.Next = null;
          locMin.Y = E.Bot.Y;
          locMin.LeftBound = null;
          locMin.RightBound = E;
          locMin.RightBound.Side = ClipperLib2.EdgeSide.esRight;
          locMin.RightBound.WindDelta = 0;
          for (; ; ) {
            if (E.Bot.X !== E.Prev.Top.X) this.ReverseHorizontal(E);
            if (E.Next.OutIdx === ClipperLib2.ClipperBase.Skip) break;
            E.NextInLML = E.Next;
            E = E.Next;
          }
          this.InsertLocalMinima(locMin);
          this.m_edges.push(edges);
          return true;
        }
        this.m_edges.push(edges);
        var leftBoundIsForward;
        var EMin = null;
        if (ClipperLib2.IntPoint.op_Equality(E.Prev.Bot, E.Prev.Top))
          E = E.Next;
        for (; ; ) {
          E = this.FindNextLocMin(E);
          if (E === EMin)
            break;
          else if (EMin === null)
            EMin = E;
          var locMin = new ClipperLib2.LocalMinima();
          locMin.Next = null;
          locMin.Y = E.Bot.Y;
          if (E.Dx < E.Prev.Dx) {
            locMin.LeftBound = E.Prev;
            locMin.RightBound = E;
            leftBoundIsForward = false;
          } else {
            locMin.LeftBound = E;
            locMin.RightBound = E.Prev;
            leftBoundIsForward = true;
          }
          locMin.LeftBound.Side = ClipperLib2.EdgeSide.esLeft;
          locMin.RightBound.Side = ClipperLib2.EdgeSide.esRight;
          if (!Closed)
            locMin.LeftBound.WindDelta = 0;
          else if (locMin.LeftBound.Next === locMin.RightBound)
            locMin.LeftBound.WindDelta = -1;
          else
            locMin.LeftBound.WindDelta = 1;
          locMin.RightBound.WindDelta = -locMin.LeftBound.WindDelta;
          E = this.ProcessBound(locMin.LeftBound, leftBoundIsForward);
          if (E.OutIdx === ClipperLib2.ClipperBase.Skip)
            E = this.ProcessBound(E, leftBoundIsForward);
          var E2 = this.ProcessBound(locMin.RightBound, !leftBoundIsForward);
          if (E2.OutIdx === ClipperLib2.ClipperBase.Skip) E2 = this.ProcessBound(E2, !leftBoundIsForward);
          if (locMin.LeftBound.OutIdx === ClipperLib2.ClipperBase.Skip)
            locMin.LeftBound = null;
          else if (locMin.RightBound.OutIdx === ClipperLib2.ClipperBase.Skip)
            locMin.RightBound = null;
          this.InsertLocalMinima(locMin);
          if (!leftBoundIsForward)
            E = E2;
        }
        return true;
      };
      ClipperLib2.ClipperBase.prototype.AddPaths = function(ppg, polyType, closed) {
        var result = false;
        for (var i = 0, ilen = ppg.length; i < ilen; ++i)
          if (this.AddPath(ppg[i], polyType, closed))
            result = true;
        return result;
      };
      ClipperLib2.ClipperBase.prototype.Pt2IsBetweenPt1AndPt3 = function(pt1, pt2, pt3) {
        if (ClipperLib2.IntPoint.op_Equality(pt1, pt3) || ClipperLib2.IntPoint.op_Equality(pt1, pt2) || ClipperLib2.IntPoint.op_Equality(pt3, pt2))
          return false;
        else if (pt1.X !== pt3.X)
          return pt2.X > pt1.X === pt2.X < pt3.X;
        else
          return pt2.Y > pt1.Y === pt2.Y < pt3.Y;
      };
      ClipperLib2.ClipperBase.prototype.RemoveEdge = function(e) {
        e.Prev.Next = e.Next;
        e.Next.Prev = e.Prev;
        var result = e.Next;
        e.Prev = null;
        return result;
      };
      ClipperLib2.ClipperBase.prototype.SetDx = function(e) {
        e.Delta.X = e.Top.X - e.Bot.X;
        e.Delta.Y = e.Top.Y - e.Bot.Y;
        if (e.Delta.Y === 0) e.Dx = ClipperLib2.ClipperBase.horizontal;
        else e.Dx = e.Delta.X / e.Delta.Y;
      };
      ClipperLib2.ClipperBase.prototype.InsertLocalMinima = function(newLm) {
        if (this.m_MinimaList === null) {
          this.m_MinimaList = newLm;
        } else if (newLm.Y >= this.m_MinimaList.Y) {
          newLm.Next = this.m_MinimaList;
          this.m_MinimaList = newLm;
        } else {
          var tmpLm = this.m_MinimaList;
          while (tmpLm.Next !== null && newLm.Y < tmpLm.Next.Y)
            tmpLm = tmpLm.Next;
          newLm.Next = tmpLm.Next;
          tmpLm.Next = newLm;
        }
      };
      ClipperLib2.ClipperBase.prototype.PopLocalMinima = function(Y, current) {
        current.v = this.m_CurrentLM;
        if (this.m_CurrentLM !== null && this.m_CurrentLM.Y === Y) {
          this.m_CurrentLM = this.m_CurrentLM.Next;
          return true;
        }
        return false;
      };
      ClipperLib2.ClipperBase.prototype.ReverseHorizontal = function(e) {
        var tmp = e.Top.X;
        e.Top.X = e.Bot.X;
        e.Bot.X = tmp;
        if (ClipperLib2.use_xyz) {
          tmp = e.Top.Z;
          e.Top.Z = e.Bot.Z;
          e.Bot.Z = tmp;
        }
      };
      ClipperLib2.ClipperBase.prototype.Reset = function() {
        this.m_CurrentLM = this.m_MinimaList;
        if (this.m_CurrentLM === null)
          return;
        this.m_Scanbeam = null;
        var lm = this.m_MinimaList;
        while (lm !== null) {
          this.InsertScanbeam(lm.Y);
          var e = lm.LeftBound;
          if (e !== null) {
            e.Curr.X = e.Bot.X;
            e.Curr.Y = e.Bot.Y;
            if (ClipperLib2.use_xyz) e.Curr.Z = e.Bot.Z;
            e.OutIdx = ClipperLib2.ClipperBase.Unassigned;
          }
          e = lm.RightBound;
          if (e !== null) {
            e.Curr.X = e.Bot.X;
            e.Curr.Y = e.Bot.Y;
            if (ClipperLib2.use_xyz) e.Curr.Z = e.Bot.Z;
            e.OutIdx = ClipperLib2.ClipperBase.Unassigned;
          }
          lm = lm.Next;
        }
        this.m_ActiveEdges = null;
      };
      ClipperLib2.ClipperBase.prototype.InsertScanbeam = function(Y) {
        if (this.m_Scanbeam === null) {
          this.m_Scanbeam = new ClipperLib2.Scanbeam();
          this.m_Scanbeam.Next = null;
          this.m_Scanbeam.Y = Y;
        } else if (Y > this.m_Scanbeam.Y) {
          var newSb = new ClipperLib2.Scanbeam();
          newSb.Y = Y;
          newSb.Next = this.m_Scanbeam;
          this.m_Scanbeam = newSb;
        } else {
          var sb2 = this.m_Scanbeam;
          while (sb2.Next !== null && Y <= sb2.Next.Y) {
            sb2 = sb2.Next;
          }
          if (Y === sb2.Y) {
            return;
          }
          var newSb1 = new ClipperLib2.Scanbeam();
          newSb1.Y = Y;
          newSb1.Next = sb2.Next;
          sb2.Next = newSb1;
        }
      };
      ClipperLib2.ClipperBase.prototype.PopScanbeam = function(Y) {
        if (this.m_Scanbeam === null) {
          Y.v = 0;
          return false;
        }
        Y.v = this.m_Scanbeam.Y;
        this.m_Scanbeam = this.m_Scanbeam.Next;
        return true;
      };
      ClipperLib2.ClipperBase.prototype.LocalMinimaPending = function() {
        return this.m_CurrentLM !== null;
      };
      ClipperLib2.ClipperBase.prototype.CreateOutRec = function() {
        var result = new ClipperLib2.OutRec();
        result.Idx = ClipperLib2.ClipperBase.Unassigned;
        result.IsHole = false;
        result.IsOpen = false;
        result.FirstLeft = null;
        result.Pts = null;
        result.BottomPt = null;
        result.PolyNode = null;
        this.m_PolyOuts.push(result);
        result.Idx = this.m_PolyOuts.length - 1;
        return result;
      };
      ClipperLib2.ClipperBase.prototype.DisposeOutRec = function(index) {
        var outRec = this.m_PolyOuts[index];
        outRec.Pts = null;
        outRec = null;
        this.m_PolyOuts[index] = null;
      };
      ClipperLib2.ClipperBase.prototype.UpdateEdgeIntoAEL = function(e) {
        if (e.NextInLML === null) {
          ClipperLib2.Error("UpdateEdgeIntoAEL: invalid call");
        }
        var AelPrev = e.PrevInAEL;
        var AelNext = e.NextInAEL;
        e.NextInLML.OutIdx = e.OutIdx;
        if (AelPrev !== null) {
          AelPrev.NextInAEL = e.NextInLML;
        } else {
          this.m_ActiveEdges = e.NextInLML;
        }
        if (AelNext !== null) {
          AelNext.PrevInAEL = e.NextInLML;
        }
        e.NextInLML.Side = e.Side;
        e.NextInLML.WindDelta = e.WindDelta;
        e.NextInLML.WindCnt = e.WindCnt;
        e.NextInLML.WindCnt2 = e.WindCnt2;
        e = e.NextInLML;
        e.Curr.X = e.Bot.X;
        e.Curr.Y = e.Bot.Y;
        e.PrevInAEL = AelPrev;
        e.NextInAEL = AelNext;
        if (!ClipperLib2.ClipperBase.IsHorizontal(e)) {
          this.InsertScanbeam(e.Top.Y);
        }
        return e;
      };
      ClipperLib2.ClipperBase.prototype.SwapPositionsInAEL = function(edge1, edge2) {
        if (edge1.NextInAEL === edge1.PrevInAEL || edge2.NextInAEL === edge2.PrevInAEL) {
          return;
        }
        if (edge1.NextInAEL === edge2) {
          var next = edge2.NextInAEL;
          if (next !== null) {
            next.PrevInAEL = edge1;
          }
          var prev = edge1.PrevInAEL;
          if (prev !== null) {
            prev.NextInAEL = edge2;
          }
          edge2.PrevInAEL = prev;
          edge2.NextInAEL = edge1;
          edge1.PrevInAEL = edge2;
          edge1.NextInAEL = next;
        } else if (edge2.NextInAEL === edge1) {
          var next1 = edge1.NextInAEL;
          if (next1 !== null) {
            next1.PrevInAEL = edge2;
          }
          var prev1 = edge2.PrevInAEL;
          if (prev1 !== null) {
            prev1.NextInAEL = edge1;
          }
          edge1.PrevInAEL = prev1;
          edge1.NextInAEL = edge2;
          edge2.PrevInAEL = edge1;
          edge2.NextInAEL = next1;
        } else {
          var next2 = edge1.NextInAEL;
          var prev2 = edge1.PrevInAEL;
          edge1.NextInAEL = edge2.NextInAEL;
          if (edge1.NextInAEL !== null) {
            edge1.NextInAEL.PrevInAEL = edge1;
          }
          edge1.PrevInAEL = edge2.PrevInAEL;
          if (edge1.PrevInAEL !== null) {
            edge1.PrevInAEL.NextInAEL = edge1;
          }
          edge2.NextInAEL = next2;
          if (edge2.NextInAEL !== null) {
            edge2.NextInAEL.PrevInAEL = edge2;
          }
          edge2.PrevInAEL = prev2;
          if (edge2.PrevInAEL !== null) {
            edge2.PrevInAEL.NextInAEL = edge2;
          }
        }
        if (edge1.PrevInAEL === null) {
          this.m_ActiveEdges = edge1;
        } else {
          if (edge2.PrevInAEL === null) {
            this.m_ActiveEdges = edge2;
          }
        }
      };
      ClipperLib2.ClipperBase.prototype.DeleteFromAEL = function(e) {
        var AelPrev = e.PrevInAEL;
        var AelNext = e.NextInAEL;
        if (AelPrev === null && AelNext === null && e !== this.m_ActiveEdges) {
          return;
        }
        if (AelPrev !== null) {
          AelPrev.NextInAEL = AelNext;
        } else {
          this.m_ActiveEdges = AelNext;
        }
        if (AelNext !== null) {
          AelNext.PrevInAEL = AelPrev;
        }
        e.NextInAEL = null;
        e.PrevInAEL = null;
      };
      ClipperLib2.Clipper = function(InitOptions) {
        if (typeof InitOptions === "undefined") InitOptions = 0;
        this.m_PolyOuts = null;
        this.m_ClipType = ClipperLib2.ClipType.ctIntersection;
        this.m_Scanbeam = null;
        this.m_Maxima = null;
        this.m_ActiveEdges = null;
        this.m_SortedEdges = null;
        this.m_IntersectList = null;
        this.m_IntersectNodeComparer = null;
        this.m_ExecuteLocked = false;
        this.m_ClipFillType = ClipperLib2.PolyFillType.pftEvenOdd;
        this.m_SubjFillType = ClipperLib2.PolyFillType.pftEvenOdd;
        this.m_Joins = null;
        this.m_GhostJoins = null;
        this.m_UsingPolyTree = false;
        this.ReverseSolution = false;
        this.StrictlySimple = false;
        ClipperLib2.ClipperBase.call(this);
        this.m_Scanbeam = null;
        this.m_Maxima = null;
        this.m_ActiveEdges = null;
        this.m_SortedEdges = null;
        this.m_IntersectList = new Array();
        this.m_IntersectNodeComparer = ClipperLib2.MyIntersectNodeSort.Compare;
        this.m_ExecuteLocked = false;
        this.m_UsingPolyTree = false;
        this.m_PolyOuts = new Array();
        this.m_Joins = new Array();
        this.m_GhostJoins = new Array();
        this.ReverseSolution = (1 & InitOptions) !== 0;
        this.StrictlySimple = (2 & InitOptions) !== 0;
        this.PreserveCollinear = (4 & InitOptions) !== 0;
        if (ClipperLib2.use_xyz) {
          this.ZFillFunction = null;
        }
      };
      ClipperLib2.Clipper.ioReverseSolution = 1;
      ClipperLib2.Clipper.ioStrictlySimple = 2;
      ClipperLib2.Clipper.ioPreserveCollinear = 4;
      ClipperLib2.Clipper.prototype.Clear = function() {
        if (this.m_edges.length === 0)
          return;
        this.DisposeAllPolyPts();
        ClipperLib2.ClipperBase.prototype.Clear.call(this);
      };
      ClipperLib2.Clipper.prototype.InsertMaxima = function(X) {
        var newMax = new ClipperLib2.Maxima();
        newMax.X = X;
        if (this.m_Maxima === null) {
          this.m_Maxima = newMax;
          this.m_Maxima.Next = null;
          this.m_Maxima.Prev = null;
        } else if (X < this.m_Maxima.X) {
          newMax.Next = this.m_Maxima;
          newMax.Prev = null;
          this.m_Maxima = newMax;
        } else {
          var m = this.m_Maxima;
          while (m.Next !== null && X >= m.Next.X) {
            m = m.Next;
          }
          if (X === m.X) {
            return;
          }
          newMax.Next = m.Next;
          newMax.Prev = m;
          if (m.Next !== null) {
            m.Next.Prev = newMax;
          }
          m.Next = newMax;
        }
      };
      ClipperLib2.Clipper.prototype.Execute = function() {
        var a = arguments, alen = a.length, ispolytree = a[1] instanceof ClipperLib2.PolyTree;
        if (alen === 4 && !ispolytree) {
          var clipType = a[0], solution = a[1], subjFillType = a[2], clipFillType = a[3];
          if (this.m_ExecuteLocked)
            return false;
          if (this.m_HasOpenPaths)
            ClipperLib2.Error("Error: PolyTree struct is needed for open path clipping.");
          this.m_ExecuteLocked = true;
          ClipperLib2.Clear(solution);
          this.m_SubjFillType = subjFillType;
          this.m_ClipFillType = clipFillType;
          this.m_ClipType = clipType;
          this.m_UsingPolyTree = false;
          try {
            var succeeded = this.ExecuteInternal();
            if (succeeded) this.BuildResult(solution);
          } finally {
            this.DisposeAllPolyPts();
            this.m_ExecuteLocked = false;
          }
          return succeeded;
        } else if (alen === 4 && ispolytree) {
          var clipType = a[0], polytree = a[1], subjFillType = a[2], clipFillType = a[3];
          if (this.m_ExecuteLocked)
            return false;
          this.m_ExecuteLocked = true;
          this.m_SubjFillType = subjFillType;
          this.m_ClipFillType = clipFillType;
          this.m_ClipType = clipType;
          this.m_UsingPolyTree = true;
          try {
            var succeeded = this.ExecuteInternal();
            if (succeeded) this.BuildResult2(polytree);
          } finally {
            this.DisposeAllPolyPts();
            this.m_ExecuteLocked = false;
          }
          return succeeded;
        } else if (alen === 2 && !ispolytree) {
          var clipType = a[0], solution = a[1];
          return this.Execute(clipType, solution, ClipperLib2.PolyFillType.pftEvenOdd, ClipperLib2.PolyFillType.pftEvenOdd);
        } else if (alen === 2 && ispolytree) {
          var clipType = a[0], polytree = a[1];
          return this.Execute(clipType, polytree, ClipperLib2.PolyFillType.pftEvenOdd, ClipperLib2.PolyFillType.pftEvenOdd);
        }
      };
      ClipperLib2.Clipper.prototype.FixHoleLinkage = function(outRec) {
        if (outRec.FirstLeft === null || outRec.IsHole !== outRec.FirstLeft.IsHole && outRec.FirstLeft.Pts !== null)
          return;
        var orfl = outRec.FirstLeft;
        while (orfl !== null && (orfl.IsHole === outRec.IsHole || orfl.Pts === null))
          orfl = orfl.FirstLeft;
        outRec.FirstLeft = orfl;
      };
      ClipperLib2.Clipper.prototype.ExecuteInternal = function() {
        try {
          this.Reset();
          this.m_SortedEdges = null;
          this.m_Maxima = null;
          var botY = {}, topY = {};
          if (!this.PopScanbeam(botY)) {
            return false;
          }
          this.InsertLocalMinimaIntoAEL(botY.v);
          while (this.PopScanbeam(topY) || this.LocalMinimaPending()) {
            this.ProcessHorizontals();
            this.m_GhostJoins.length = 0;
            if (!this.ProcessIntersections(topY.v)) {
              return false;
            }
            this.ProcessEdgesAtTopOfScanbeam(topY.v);
            botY.v = topY.v;
            this.InsertLocalMinimaIntoAEL(botY.v);
          }
          var outRec, i, ilen;
          for (i = 0, ilen = this.m_PolyOuts.length; i < ilen; i++) {
            outRec = this.m_PolyOuts[i];
            if (outRec.Pts === null || outRec.IsOpen) continue;
            if ((outRec.IsHole ^ this.ReverseSolution) == this.Area$1(outRec) > 0)
              this.ReversePolyPtLinks(outRec.Pts);
          }
          this.JoinCommonEdges();
          for (i = 0, ilen = this.m_PolyOuts.length; i < ilen; i++) {
            outRec = this.m_PolyOuts[i];
            if (outRec.Pts === null)
              continue;
            else if (outRec.IsOpen)
              this.FixupOutPolyline(outRec);
            else
              this.FixupOutPolygon(outRec);
          }
          if (this.StrictlySimple) this.DoSimplePolygons();
          return true;
        } finally {
          this.m_Joins.length = 0;
          this.m_GhostJoins.length = 0;
        }
      };
      ClipperLib2.Clipper.prototype.DisposeAllPolyPts = function() {
        for (var i = 0, ilen = this.m_PolyOuts.length; i < ilen; ++i)
          this.DisposeOutRec(i);
        ClipperLib2.Clear(this.m_PolyOuts);
      };
      ClipperLib2.Clipper.prototype.AddJoin = function(Op1, Op2, OffPt) {
        var j = new ClipperLib2.Join();
        j.OutPt1 = Op1;
        j.OutPt2 = Op2;
        j.OffPt.X = OffPt.X;
        j.OffPt.Y = OffPt.Y;
        if (ClipperLib2.use_xyz) j.OffPt.Z = OffPt.Z;
        this.m_Joins.push(j);
      };
      ClipperLib2.Clipper.prototype.AddGhostJoin = function(Op, OffPt) {
        var j = new ClipperLib2.Join();
        j.OutPt1 = Op;
        j.OffPt.X = OffPt.X;
        j.OffPt.Y = OffPt.Y;
        if (ClipperLib2.use_xyz) j.OffPt.Z = OffPt.Z;
        this.m_GhostJoins.push(j);
      };
      ClipperLib2.Clipper.prototype.SetZ = function(pt, e1, e2) {
        if (this.ZFillFunction !== null) {
          if (pt.Z !== 0 || this.ZFillFunction === null) return;
          else if (ClipperLib2.IntPoint.op_Equality(pt, e1.Bot)) pt.Z = e1.Bot.Z;
          else if (ClipperLib2.IntPoint.op_Equality(pt, e1.Top)) pt.Z = e1.Top.Z;
          else if (ClipperLib2.IntPoint.op_Equality(pt, e2.Bot)) pt.Z = e2.Bot.Z;
          else if (ClipperLib2.IntPoint.op_Equality(pt, e2.Top)) pt.Z = e2.Top.Z;
          else this.ZFillFunction(e1.Bot, e1.Top, e2.Bot, e2.Top, pt);
        }
      };
      ClipperLib2.Clipper.prototype.InsertLocalMinimaIntoAEL = function(botY) {
        var lm = {};
        var lb;
        var rb;
        while (this.PopLocalMinima(botY, lm)) {
          lb = lm.v.LeftBound;
          rb = lm.v.RightBound;
          var Op1 = null;
          if (lb === null) {
            this.InsertEdgeIntoAEL(rb, null);
            this.SetWindingCount(rb);
            if (this.IsContributing(rb))
              Op1 = this.AddOutPt(rb, rb.Bot);
          } else if (rb === null) {
            this.InsertEdgeIntoAEL(lb, null);
            this.SetWindingCount(lb);
            if (this.IsContributing(lb))
              Op1 = this.AddOutPt(lb, lb.Bot);
            this.InsertScanbeam(lb.Top.Y);
          } else {
            this.InsertEdgeIntoAEL(lb, null);
            this.InsertEdgeIntoAEL(rb, lb);
            this.SetWindingCount(lb);
            rb.WindCnt = lb.WindCnt;
            rb.WindCnt2 = lb.WindCnt2;
            if (this.IsContributing(lb))
              Op1 = this.AddLocalMinPoly(lb, rb, lb.Bot);
            this.InsertScanbeam(lb.Top.Y);
          }
          if (rb !== null) {
            if (ClipperLib2.ClipperBase.IsHorizontal(rb)) {
              if (rb.NextInLML !== null) {
                this.InsertScanbeam(rb.NextInLML.Top.Y);
              }
              this.AddEdgeToSEL(rb);
            } else {
              this.InsertScanbeam(rb.Top.Y);
            }
          }
          if (lb === null || rb === null) continue;
          if (Op1 !== null && ClipperLib2.ClipperBase.IsHorizontal(rb) && this.m_GhostJoins.length > 0 && rb.WindDelta !== 0) {
            for (var i = 0, ilen = this.m_GhostJoins.length; i < ilen; i++) {
              var j = this.m_GhostJoins[i];
              if (this.HorzSegmentsOverlap(j.OutPt1.Pt.X, j.OffPt.X, rb.Bot.X, rb.Top.X))
                this.AddJoin(j.OutPt1, Op1, j.OffPt);
            }
          }
          if (lb.OutIdx >= 0 && lb.PrevInAEL !== null && lb.PrevInAEL.Curr.X === lb.Bot.X && lb.PrevInAEL.OutIdx >= 0 && ClipperLib2.ClipperBase.SlopesEqual5(lb.PrevInAEL.Curr, lb.PrevInAEL.Top, lb.Curr, lb.Top, this.m_UseFullRange) && lb.WindDelta !== 0 && lb.PrevInAEL.WindDelta !== 0) {
            var Op2 = this.AddOutPt(lb.PrevInAEL, lb.Bot);
            this.AddJoin(Op1, Op2, lb.Top);
          }
          if (lb.NextInAEL !== rb) {
            if (rb.OutIdx >= 0 && rb.PrevInAEL.OutIdx >= 0 && ClipperLib2.ClipperBase.SlopesEqual5(rb.PrevInAEL.Curr, rb.PrevInAEL.Top, rb.Curr, rb.Top, this.m_UseFullRange) && rb.WindDelta !== 0 && rb.PrevInAEL.WindDelta !== 0) {
              var Op2 = this.AddOutPt(rb.PrevInAEL, rb.Bot);
              this.AddJoin(Op1, Op2, rb.Top);
            }
            var e = lb.NextInAEL;
            if (e !== null)
              while (e !== rb) {
                this.IntersectEdges(rb, e, lb.Curr);
                e = e.NextInAEL;
              }
          }
        }
      };
      ClipperLib2.Clipper.prototype.InsertEdgeIntoAEL = function(edge, startEdge) {
        if (this.m_ActiveEdges === null) {
          edge.PrevInAEL = null;
          edge.NextInAEL = null;
          this.m_ActiveEdges = edge;
        } else if (startEdge === null && this.E2InsertsBeforeE1(this.m_ActiveEdges, edge)) {
          edge.PrevInAEL = null;
          edge.NextInAEL = this.m_ActiveEdges;
          this.m_ActiveEdges.PrevInAEL = edge;
          this.m_ActiveEdges = edge;
        } else {
          if (startEdge === null)
            startEdge = this.m_ActiveEdges;
          while (startEdge.NextInAEL !== null && !this.E2InsertsBeforeE1(startEdge.NextInAEL, edge))
            startEdge = startEdge.NextInAEL;
          edge.NextInAEL = startEdge.NextInAEL;
          if (startEdge.NextInAEL !== null)
            startEdge.NextInAEL.PrevInAEL = edge;
          edge.PrevInAEL = startEdge;
          startEdge.NextInAEL = edge;
        }
      };
      ClipperLib2.Clipper.prototype.E2InsertsBeforeE1 = function(e1, e2) {
        if (e2.Curr.X === e1.Curr.X) {
          if (e2.Top.Y > e1.Top.Y)
            return e2.Top.X < ClipperLib2.Clipper.TopX(e1, e2.Top.Y);
          else
            return e1.Top.X > ClipperLib2.Clipper.TopX(e2, e1.Top.Y);
        } else
          return e2.Curr.X < e1.Curr.X;
      };
      ClipperLib2.Clipper.prototype.IsEvenOddFillType = function(edge) {
        if (edge.PolyTyp === ClipperLib2.PolyType.ptSubject)
          return this.m_SubjFillType === ClipperLib2.PolyFillType.pftEvenOdd;
        else
          return this.m_ClipFillType === ClipperLib2.PolyFillType.pftEvenOdd;
      };
      ClipperLib2.Clipper.prototype.IsEvenOddAltFillType = function(edge) {
        if (edge.PolyTyp === ClipperLib2.PolyType.ptSubject)
          return this.m_ClipFillType === ClipperLib2.PolyFillType.pftEvenOdd;
        else
          return this.m_SubjFillType === ClipperLib2.PolyFillType.pftEvenOdd;
      };
      ClipperLib2.Clipper.prototype.IsContributing = function(edge) {
        var pft, pft2;
        if (edge.PolyTyp === ClipperLib2.PolyType.ptSubject) {
          pft = this.m_SubjFillType;
          pft2 = this.m_ClipFillType;
        } else {
          pft = this.m_ClipFillType;
          pft2 = this.m_SubjFillType;
        }
        switch (pft) {
          case ClipperLib2.PolyFillType.pftEvenOdd:
            if (edge.WindDelta === 0 && edge.WindCnt !== 1)
              return false;
            break;
          case ClipperLib2.PolyFillType.pftNonZero:
            if (Math.abs(edge.WindCnt) !== 1)
              return false;
            break;
          case ClipperLib2.PolyFillType.pftPositive:
            if (edge.WindCnt !== 1)
              return false;
            break;
          default:
            if (edge.WindCnt !== -1)
              return false;
            break;
        }
        switch (this.m_ClipType) {
          case ClipperLib2.ClipType.ctIntersection:
            switch (pft2) {
              case ClipperLib2.PolyFillType.pftEvenOdd:
              case ClipperLib2.PolyFillType.pftNonZero:
                return edge.WindCnt2 !== 0;
              case ClipperLib2.PolyFillType.pftPositive:
                return edge.WindCnt2 > 0;
              default:
                return edge.WindCnt2 < 0;
            }
          case ClipperLib2.ClipType.ctUnion:
            switch (pft2) {
              case ClipperLib2.PolyFillType.pftEvenOdd:
              case ClipperLib2.PolyFillType.pftNonZero:
                return edge.WindCnt2 === 0;
              case ClipperLib2.PolyFillType.pftPositive:
                return edge.WindCnt2 <= 0;
              default:
                return edge.WindCnt2 >= 0;
            }
          case ClipperLib2.ClipType.ctDifference:
            if (edge.PolyTyp === ClipperLib2.PolyType.ptSubject)
              switch (pft2) {
                case ClipperLib2.PolyFillType.pftEvenOdd:
                case ClipperLib2.PolyFillType.pftNonZero:
                  return edge.WindCnt2 === 0;
                case ClipperLib2.PolyFillType.pftPositive:
                  return edge.WindCnt2 <= 0;
                default:
                  return edge.WindCnt2 >= 0;
              }
            else
              switch (pft2) {
                case ClipperLib2.PolyFillType.pftEvenOdd:
                case ClipperLib2.PolyFillType.pftNonZero:
                  return edge.WindCnt2 !== 0;
                case ClipperLib2.PolyFillType.pftPositive:
                  return edge.WindCnt2 > 0;
                default:
                  return edge.WindCnt2 < 0;
              }
          case ClipperLib2.ClipType.ctXor:
            if (edge.WindDelta === 0)
              switch (pft2) {
                case ClipperLib2.PolyFillType.pftEvenOdd:
                case ClipperLib2.PolyFillType.pftNonZero:
                  return edge.WindCnt2 === 0;
                case ClipperLib2.PolyFillType.pftPositive:
                  return edge.WindCnt2 <= 0;
                default:
                  return edge.WindCnt2 >= 0;
              }
            else
              return true;
        }
        return true;
      };
      ClipperLib2.Clipper.prototype.SetWindingCount = function(edge) {
        var e = edge.PrevInAEL;
        while (e !== null && (e.PolyTyp !== edge.PolyTyp || e.WindDelta === 0))
          e = e.PrevInAEL;
        if (e === null) {
          var pft = edge.PolyTyp === ClipperLib2.PolyType.ptSubject ? this.m_SubjFillType : this.m_ClipFillType;
          if (edge.WindDelta === 0) {
            edge.WindCnt = pft === ClipperLib2.PolyFillType.pftNegative ? -1 : 1;
          } else {
            edge.WindCnt = edge.WindDelta;
          }
          edge.WindCnt2 = 0;
          e = this.m_ActiveEdges;
        } else if (edge.WindDelta === 0 && this.m_ClipType !== ClipperLib2.ClipType.ctUnion) {
          edge.WindCnt = 1;
          edge.WindCnt2 = e.WindCnt2;
          e = e.NextInAEL;
        } else if (this.IsEvenOddFillType(edge)) {
          if (edge.WindDelta === 0) {
            var Inside = true;
            var e2 = e.PrevInAEL;
            while (e2 !== null) {
              if (e2.PolyTyp === e.PolyTyp && e2.WindDelta !== 0)
                Inside = !Inside;
              e2 = e2.PrevInAEL;
            }
            edge.WindCnt = Inside ? 0 : 1;
          } else {
            edge.WindCnt = edge.WindDelta;
          }
          edge.WindCnt2 = e.WindCnt2;
          e = e.NextInAEL;
        } else {
          if (e.WindCnt * e.WindDelta < 0) {
            if (Math.abs(e.WindCnt) > 1) {
              if (e.WindDelta * edge.WindDelta < 0)
                edge.WindCnt = e.WindCnt;
              else
                edge.WindCnt = e.WindCnt + edge.WindDelta;
            } else
              edge.WindCnt = edge.WindDelta === 0 ? 1 : edge.WindDelta;
          } else {
            if (edge.WindDelta === 0)
              edge.WindCnt = e.WindCnt < 0 ? e.WindCnt - 1 : e.WindCnt + 1;
            else if (e.WindDelta * edge.WindDelta < 0)
              edge.WindCnt = e.WindCnt;
            else
              edge.WindCnt = e.WindCnt + edge.WindDelta;
          }
          edge.WindCnt2 = e.WindCnt2;
          e = e.NextInAEL;
        }
        if (this.IsEvenOddAltFillType(edge)) {
          while (e !== edge) {
            if (e.WindDelta !== 0)
              edge.WindCnt2 = edge.WindCnt2 === 0 ? 1 : 0;
            e = e.NextInAEL;
          }
        } else {
          while (e !== edge) {
            edge.WindCnt2 += e.WindDelta;
            e = e.NextInAEL;
          }
        }
      };
      ClipperLib2.Clipper.prototype.AddEdgeToSEL = function(edge) {
        if (this.m_SortedEdges === null) {
          this.m_SortedEdges = edge;
          edge.PrevInSEL = null;
          edge.NextInSEL = null;
        } else {
          edge.NextInSEL = this.m_SortedEdges;
          edge.PrevInSEL = null;
          this.m_SortedEdges.PrevInSEL = edge;
          this.m_SortedEdges = edge;
        }
      };
      ClipperLib2.Clipper.prototype.PopEdgeFromSEL = function(e) {
        e.v = this.m_SortedEdges;
        if (e.v === null) {
          return false;
        }
        var oldE = e.v;
        this.m_SortedEdges = e.v.NextInSEL;
        if (this.m_SortedEdges !== null) {
          this.m_SortedEdges.PrevInSEL = null;
        }
        oldE.NextInSEL = null;
        oldE.PrevInSEL = null;
        return true;
      };
      ClipperLib2.Clipper.prototype.CopyAELToSEL = function() {
        var e = this.m_ActiveEdges;
        this.m_SortedEdges = e;
        while (e !== null) {
          e.PrevInSEL = e.PrevInAEL;
          e.NextInSEL = e.NextInAEL;
          e = e.NextInAEL;
        }
      };
      ClipperLib2.Clipper.prototype.SwapPositionsInSEL = function(edge1, edge2) {
        if (edge1.NextInSEL === null && edge1.PrevInSEL === null)
          return;
        if (edge2.NextInSEL === null && edge2.PrevInSEL === null)
          return;
        if (edge1.NextInSEL === edge2) {
          var next = edge2.NextInSEL;
          if (next !== null)
            next.PrevInSEL = edge1;
          var prev = edge1.PrevInSEL;
          if (prev !== null)
            prev.NextInSEL = edge2;
          edge2.PrevInSEL = prev;
          edge2.NextInSEL = edge1;
          edge1.PrevInSEL = edge2;
          edge1.NextInSEL = next;
        } else if (edge2.NextInSEL === edge1) {
          var next = edge1.NextInSEL;
          if (next !== null)
            next.PrevInSEL = edge2;
          var prev = edge2.PrevInSEL;
          if (prev !== null)
            prev.NextInSEL = edge1;
          edge1.PrevInSEL = prev;
          edge1.NextInSEL = edge2;
          edge2.PrevInSEL = edge1;
          edge2.NextInSEL = next;
        } else {
          var next = edge1.NextInSEL;
          var prev = edge1.PrevInSEL;
          edge1.NextInSEL = edge2.NextInSEL;
          if (edge1.NextInSEL !== null)
            edge1.NextInSEL.PrevInSEL = edge1;
          edge1.PrevInSEL = edge2.PrevInSEL;
          if (edge1.PrevInSEL !== null)
            edge1.PrevInSEL.NextInSEL = edge1;
          edge2.NextInSEL = next;
          if (edge2.NextInSEL !== null)
            edge2.NextInSEL.PrevInSEL = edge2;
          edge2.PrevInSEL = prev;
          if (edge2.PrevInSEL !== null)
            edge2.PrevInSEL.NextInSEL = edge2;
        }
        if (edge1.PrevInSEL === null)
          this.m_SortedEdges = edge1;
        else if (edge2.PrevInSEL === null)
          this.m_SortedEdges = edge2;
      };
      ClipperLib2.Clipper.prototype.AddLocalMaxPoly = function(e1, e2, pt) {
        this.AddOutPt(e1, pt);
        if (e2.WindDelta === 0) this.AddOutPt(e2, pt);
        if (e1.OutIdx === e2.OutIdx) {
          e1.OutIdx = -1;
          e2.OutIdx = -1;
        } else if (e1.OutIdx < e2.OutIdx)
          this.AppendPolygon(e1, e2);
        else
          this.AppendPolygon(e2, e1);
      };
      ClipperLib2.Clipper.prototype.AddLocalMinPoly = function(e1, e2, pt) {
        var result;
        var e, prevE;
        if (ClipperLib2.ClipperBase.IsHorizontal(e2) || e1.Dx > e2.Dx) {
          result = this.AddOutPt(e1, pt);
          e2.OutIdx = e1.OutIdx;
          e1.Side = ClipperLib2.EdgeSide.esLeft;
          e2.Side = ClipperLib2.EdgeSide.esRight;
          e = e1;
          if (e.PrevInAEL === e2)
            prevE = e2.PrevInAEL;
          else
            prevE = e.PrevInAEL;
        } else {
          result = this.AddOutPt(e2, pt);
          e1.OutIdx = e2.OutIdx;
          e1.Side = ClipperLib2.EdgeSide.esRight;
          e2.Side = ClipperLib2.EdgeSide.esLeft;
          e = e2;
          if (e.PrevInAEL === e1)
            prevE = e1.PrevInAEL;
          else
            prevE = e.PrevInAEL;
        }
        if (prevE !== null && prevE.OutIdx >= 0 && prevE.Top.Y < pt.Y && e.Top.Y < pt.Y) {
          var xPrev = ClipperLib2.Clipper.TopX(prevE, pt.Y);
          var xE = ClipperLib2.Clipper.TopX(e, pt.Y);
          if (xPrev === xE && e.WindDelta !== 0 && prevE.WindDelta !== 0 && ClipperLib2.ClipperBase.SlopesEqual5(new ClipperLib2.IntPoint2(xPrev, pt.Y), prevE.Top, new ClipperLib2.IntPoint2(xE, pt.Y), e.Top, this.m_UseFullRange)) {
            var outPt = this.AddOutPt(prevE, pt);
            this.AddJoin(result, outPt, e.Top);
          }
        }
        return result;
      };
      ClipperLib2.Clipper.prototype.AddOutPt = function(e, pt) {
        if (e.OutIdx < 0) {
          var outRec = this.CreateOutRec();
          outRec.IsOpen = e.WindDelta === 0;
          var newOp = new ClipperLib2.OutPt();
          outRec.Pts = newOp;
          newOp.Idx = outRec.Idx;
          newOp.Pt.X = pt.X;
          newOp.Pt.Y = pt.Y;
          if (ClipperLib2.use_xyz) newOp.Pt.Z = pt.Z;
          newOp.Next = newOp;
          newOp.Prev = newOp;
          if (!outRec.IsOpen)
            this.SetHoleState(e, outRec);
          e.OutIdx = outRec.Idx;
          return newOp;
        } else {
          var outRec = this.m_PolyOuts[e.OutIdx];
          var op = outRec.Pts;
          var ToFront = e.Side === ClipperLib2.EdgeSide.esLeft;
          if (ToFront && ClipperLib2.IntPoint.op_Equality(pt, op.Pt))
            return op;
          else if (!ToFront && ClipperLib2.IntPoint.op_Equality(pt, op.Prev.Pt))
            return op.Prev;
          var newOp = new ClipperLib2.OutPt();
          newOp.Idx = outRec.Idx;
          newOp.Pt.X = pt.X;
          newOp.Pt.Y = pt.Y;
          if (ClipperLib2.use_xyz) newOp.Pt.Z = pt.Z;
          newOp.Next = op;
          newOp.Prev = op.Prev;
          newOp.Prev.Next = newOp;
          op.Prev = newOp;
          if (ToFront)
            outRec.Pts = newOp;
          return newOp;
        }
      };
      ClipperLib2.Clipper.prototype.GetLastOutPt = function(e) {
        var outRec = this.m_PolyOuts[e.OutIdx];
        if (e.Side === ClipperLib2.EdgeSide.esLeft) {
          return outRec.Pts;
        } else {
          return outRec.Pts.Prev;
        }
      };
      ClipperLib2.Clipper.prototype.SwapPoints = function(pt1, pt2) {
        var tmp = new ClipperLib2.IntPoint1(pt1.Value);
        pt1.Value.X = pt2.Value.X;
        pt1.Value.Y = pt2.Value.Y;
        if (ClipperLib2.use_xyz) pt1.Value.Z = pt2.Value.Z;
        pt2.Value.X = tmp.X;
        pt2.Value.Y = tmp.Y;
        if (ClipperLib2.use_xyz) pt2.Value.Z = tmp.Z;
      };
      ClipperLib2.Clipper.prototype.HorzSegmentsOverlap = function(seg1a, seg1b, seg2a, seg2b) {
        var tmp;
        if (seg1a > seg1b) {
          tmp = seg1a;
          seg1a = seg1b;
          seg1b = tmp;
        }
        if (seg2a > seg2b) {
          tmp = seg2a;
          seg2a = seg2b;
          seg2b = tmp;
        }
        return seg1a < seg2b && seg2a < seg1b;
      };
      ClipperLib2.Clipper.prototype.SetHoleState = function(e, outRec) {
        var e2 = e.PrevInAEL;
        var eTmp = null;
        while (e2 !== null) {
          if (e2.OutIdx >= 0 && e2.WindDelta !== 0) {
            if (eTmp === null)
              eTmp = e2;
            else if (eTmp.OutIdx === e2.OutIdx)
              eTmp = null;
          }
          e2 = e2.PrevInAEL;
        }
        if (eTmp === null) {
          outRec.FirstLeft = null;
          outRec.IsHole = false;
        } else {
          outRec.FirstLeft = this.m_PolyOuts[eTmp.OutIdx];
          outRec.IsHole = !outRec.FirstLeft.IsHole;
        }
      };
      ClipperLib2.Clipper.prototype.GetDx = function(pt1, pt2) {
        if (pt1.Y === pt2.Y)
          return ClipperLib2.ClipperBase.horizontal;
        else
          return (pt2.X - pt1.X) / (pt2.Y - pt1.Y);
      };
      ClipperLib2.Clipper.prototype.FirstIsBottomPt = function(btmPt1, btmPt2) {
        var p = btmPt1.Prev;
        while (ClipperLib2.IntPoint.op_Equality(p.Pt, btmPt1.Pt) && p !== btmPt1)
          p = p.Prev;
        var dx1p = Math.abs(this.GetDx(btmPt1.Pt, p.Pt));
        p = btmPt1.Next;
        while (ClipperLib2.IntPoint.op_Equality(p.Pt, btmPt1.Pt) && p !== btmPt1)
          p = p.Next;
        var dx1n = Math.abs(this.GetDx(btmPt1.Pt, p.Pt));
        p = btmPt2.Prev;
        while (ClipperLib2.IntPoint.op_Equality(p.Pt, btmPt2.Pt) && p !== btmPt2)
          p = p.Prev;
        var dx2p = Math.abs(this.GetDx(btmPt2.Pt, p.Pt));
        p = btmPt2.Next;
        while (ClipperLib2.IntPoint.op_Equality(p.Pt, btmPt2.Pt) && p !== btmPt2)
          p = p.Next;
        var dx2n = Math.abs(this.GetDx(btmPt2.Pt, p.Pt));
        if (Math.max(dx1p, dx1n) === Math.max(dx2p, dx2n) && Math.min(dx1p, dx1n) === Math.min(dx2p, dx2n)) {
          return this.Area(btmPt1) > 0;
        } else {
          return dx1p >= dx2p && dx1p >= dx2n || dx1n >= dx2p && dx1n >= dx2n;
        }
      };
      ClipperLib2.Clipper.prototype.GetBottomPt = function(pp) {
        var dups = null;
        var p = pp.Next;
        while (p !== pp) {
          if (p.Pt.Y > pp.Pt.Y) {
            pp = p;
            dups = null;
          } else if (p.Pt.Y === pp.Pt.Y && p.Pt.X <= pp.Pt.X) {
            if (p.Pt.X < pp.Pt.X) {
              dups = null;
              pp = p;
            } else {
              if (p.Next !== pp && p.Prev !== pp)
                dups = p;
            }
          }
          p = p.Next;
        }
        if (dups !== null) {
          while (dups !== p) {
            if (!this.FirstIsBottomPt(p, dups))
              pp = dups;
            dups = dups.Next;
            while (ClipperLib2.IntPoint.op_Inequality(dups.Pt, pp.Pt))
              dups = dups.Next;
          }
        }
        return pp;
      };
      ClipperLib2.Clipper.prototype.GetLowermostRec = function(outRec1, outRec2) {
        if (outRec1.BottomPt === null)
          outRec1.BottomPt = this.GetBottomPt(outRec1.Pts);
        if (outRec2.BottomPt === null)
          outRec2.BottomPt = this.GetBottomPt(outRec2.Pts);
        var bPt1 = outRec1.BottomPt;
        var bPt2 = outRec2.BottomPt;
        if (bPt1.Pt.Y > bPt2.Pt.Y)
          return outRec1;
        else if (bPt1.Pt.Y < bPt2.Pt.Y)
          return outRec2;
        else if (bPt1.Pt.X < bPt2.Pt.X)
          return outRec1;
        else if (bPt1.Pt.X > bPt2.Pt.X)
          return outRec2;
        else if (bPt1.Next === bPt1)
          return outRec2;
        else if (bPt2.Next === bPt2)
          return outRec1;
        else if (this.FirstIsBottomPt(bPt1, bPt2))
          return outRec1;
        else
          return outRec2;
      };
      ClipperLib2.Clipper.prototype.OutRec1RightOfOutRec2 = function(outRec1, outRec2) {
        do {
          outRec1 = outRec1.FirstLeft;
          if (outRec1 === outRec2)
            return true;
        } while (outRec1 !== null);
        return false;
      };
      ClipperLib2.Clipper.prototype.GetOutRec = function(idx) {
        var outrec = this.m_PolyOuts[idx];
        while (outrec !== this.m_PolyOuts[outrec.Idx])
          outrec = this.m_PolyOuts[outrec.Idx];
        return outrec;
      };
      ClipperLib2.Clipper.prototype.AppendPolygon = function(e1, e2) {
        var outRec1 = this.m_PolyOuts[e1.OutIdx];
        var outRec2 = this.m_PolyOuts[e2.OutIdx];
        var holeStateRec;
        if (this.OutRec1RightOfOutRec2(outRec1, outRec2))
          holeStateRec = outRec2;
        else if (this.OutRec1RightOfOutRec2(outRec2, outRec1))
          holeStateRec = outRec1;
        else
          holeStateRec = this.GetLowermostRec(outRec1, outRec2);
        var p1_lft = outRec1.Pts;
        var p1_rt = p1_lft.Prev;
        var p2_lft = outRec2.Pts;
        var p2_rt = p2_lft.Prev;
        if (e1.Side === ClipperLib2.EdgeSide.esLeft) {
          if (e2.Side === ClipperLib2.EdgeSide.esLeft) {
            this.ReversePolyPtLinks(p2_lft);
            p2_lft.Next = p1_lft;
            p1_lft.Prev = p2_lft;
            p1_rt.Next = p2_rt;
            p2_rt.Prev = p1_rt;
            outRec1.Pts = p2_rt;
          } else {
            p2_rt.Next = p1_lft;
            p1_lft.Prev = p2_rt;
            p2_lft.Prev = p1_rt;
            p1_rt.Next = p2_lft;
            outRec1.Pts = p2_lft;
          }
        } else {
          if (e2.Side === ClipperLib2.EdgeSide.esRight) {
            this.ReversePolyPtLinks(p2_lft);
            p1_rt.Next = p2_rt;
            p2_rt.Prev = p1_rt;
            p2_lft.Next = p1_lft;
            p1_lft.Prev = p2_lft;
          } else {
            p1_rt.Next = p2_lft;
            p2_lft.Prev = p1_rt;
            p1_lft.Prev = p2_rt;
            p2_rt.Next = p1_lft;
          }
        }
        outRec1.BottomPt = null;
        if (holeStateRec === outRec2) {
          if (outRec2.FirstLeft !== outRec1)
            outRec1.FirstLeft = outRec2.FirstLeft;
          outRec1.IsHole = outRec2.IsHole;
        }
        outRec2.Pts = null;
        outRec2.BottomPt = null;
        outRec2.FirstLeft = outRec1;
        var OKIdx = e1.OutIdx;
        var ObsoleteIdx = e2.OutIdx;
        e1.OutIdx = -1;
        e2.OutIdx = -1;
        var e = this.m_ActiveEdges;
        while (e !== null) {
          if (e.OutIdx === ObsoleteIdx) {
            e.OutIdx = OKIdx;
            e.Side = e1.Side;
            break;
          }
          e = e.NextInAEL;
        }
        outRec2.Idx = outRec1.Idx;
      };
      ClipperLib2.Clipper.prototype.ReversePolyPtLinks = function(pp) {
        if (pp === null)
          return;
        var pp1;
        var pp2;
        pp1 = pp;
        do {
          pp2 = pp1.Next;
          pp1.Next = pp1.Prev;
          pp1.Prev = pp2;
          pp1 = pp2;
        } while (pp1 !== pp);
      };
      ClipperLib2.Clipper.SwapSides = function(edge1, edge2) {
        var side = edge1.Side;
        edge1.Side = edge2.Side;
        edge2.Side = side;
      };
      ClipperLib2.Clipper.SwapPolyIndexes = function(edge1, edge2) {
        var outIdx = edge1.OutIdx;
        edge1.OutIdx = edge2.OutIdx;
        edge2.OutIdx = outIdx;
      };
      ClipperLib2.Clipper.prototype.IntersectEdges = function(e1, e2, pt) {
        var e1Contributing = e1.OutIdx >= 0;
        var e2Contributing = e2.OutIdx >= 0;
        if (ClipperLib2.use_xyz)
          this.SetZ(pt, e1, e2);
        if (ClipperLib2.use_lines) {
          if (e1.WindDelta === 0 || e2.WindDelta === 0) {
            if (e1.WindDelta === 0 && e2.WindDelta === 0) return;
            else if (e1.PolyTyp === e2.PolyTyp && e1.WindDelta !== e2.WindDelta && this.m_ClipType === ClipperLib2.ClipType.ctUnion) {
              if (e1.WindDelta === 0) {
                if (e2Contributing) {
                  this.AddOutPt(e1, pt);
                  if (e1Contributing)
                    e1.OutIdx = -1;
                }
              } else {
                if (e1Contributing) {
                  this.AddOutPt(e2, pt);
                  if (e2Contributing)
                    e2.OutIdx = -1;
                }
              }
            } else if (e1.PolyTyp !== e2.PolyTyp) {
              if (e1.WindDelta === 0 && Math.abs(e2.WindCnt) === 1 && (this.m_ClipType !== ClipperLib2.ClipType.ctUnion || e2.WindCnt2 === 0)) {
                this.AddOutPt(e1, pt);
                if (e1Contributing)
                  e1.OutIdx = -1;
              } else if (e2.WindDelta === 0 && Math.abs(e1.WindCnt) === 1 && (this.m_ClipType !== ClipperLib2.ClipType.ctUnion || e1.WindCnt2 === 0)) {
                this.AddOutPt(e2, pt);
                if (e2Contributing)
                  e2.OutIdx = -1;
              }
            }
            return;
          }
        }
        if (e1.PolyTyp === e2.PolyTyp) {
          if (this.IsEvenOddFillType(e1)) {
            var oldE1WindCnt = e1.WindCnt;
            e1.WindCnt = e2.WindCnt;
            e2.WindCnt = oldE1WindCnt;
          } else {
            if (e1.WindCnt + e2.WindDelta === 0)
              e1.WindCnt = -e1.WindCnt;
            else
              e1.WindCnt += e2.WindDelta;
            if (e2.WindCnt - e1.WindDelta === 0)
              e2.WindCnt = -e2.WindCnt;
            else
              e2.WindCnt -= e1.WindDelta;
          }
        } else {
          if (!this.IsEvenOddFillType(e2))
            e1.WindCnt2 += e2.WindDelta;
          else
            e1.WindCnt2 = e1.WindCnt2 === 0 ? 1 : 0;
          if (!this.IsEvenOddFillType(e1))
            e2.WindCnt2 -= e1.WindDelta;
          else
            e2.WindCnt2 = e2.WindCnt2 === 0 ? 1 : 0;
        }
        var e1FillType, e2FillType, e1FillType2, e2FillType2;
        if (e1.PolyTyp === ClipperLib2.PolyType.ptSubject) {
          e1FillType = this.m_SubjFillType;
          e1FillType2 = this.m_ClipFillType;
        } else {
          e1FillType = this.m_ClipFillType;
          e1FillType2 = this.m_SubjFillType;
        }
        if (e2.PolyTyp === ClipperLib2.PolyType.ptSubject) {
          e2FillType = this.m_SubjFillType;
          e2FillType2 = this.m_ClipFillType;
        } else {
          e2FillType = this.m_ClipFillType;
          e2FillType2 = this.m_SubjFillType;
        }
        var e1Wc, e2Wc;
        switch (e1FillType) {
          case ClipperLib2.PolyFillType.pftPositive:
            e1Wc = e1.WindCnt;
            break;
          case ClipperLib2.PolyFillType.pftNegative:
            e1Wc = -e1.WindCnt;
            break;
          default:
            e1Wc = Math.abs(e1.WindCnt);
            break;
        }
        switch (e2FillType) {
          case ClipperLib2.PolyFillType.pftPositive:
            e2Wc = e2.WindCnt;
            break;
          case ClipperLib2.PolyFillType.pftNegative:
            e2Wc = -e2.WindCnt;
            break;
          default:
            e2Wc = Math.abs(e2.WindCnt);
            break;
        }
        if (e1Contributing && e2Contributing) {
          if (e1Wc !== 0 && e1Wc !== 1 || e2Wc !== 0 && e2Wc !== 1 || e1.PolyTyp !== e2.PolyTyp && this.m_ClipType !== ClipperLib2.ClipType.ctXor) {
            this.AddLocalMaxPoly(e1, e2, pt);
          } else {
            this.AddOutPt(e1, pt);
            this.AddOutPt(e2, pt);
            ClipperLib2.Clipper.SwapSides(e1, e2);
            ClipperLib2.Clipper.SwapPolyIndexes(e1, e2);
          }
        } else if (e1Contributing) {
          if (e2Wc === 0 || e2Wc === 1) {
            this.AddOutPt(e1, pt);
            ClipperLib2.Clipper.SwapSides(e1, e2);
            ClipperLib2.Clipper.SwapPolyIndexes(e1, e2);
          }
        } else if (e2Contributing) {
          if (e1Wc === 0 || e1Wc === 1) {
            this.AddOutPt(e2, pt);
            ClipperLib2.Clipper.SwapSides(e1, e2);
            ClipperLib2.Clipper.SwapPolyIndexes(e1, e2);
          }
        } else if ((e1Wc === 0 || e1Wc === 1) && (e2Wc === 0 || e2Wc === 1)) {
          var e1Wc2, e2Wc2;
          switch (e1FillType2) {
            case ClipperLib2.PolyFillType.pftPositive:
              e1Wc2 = e1.WindCnt2;
              break;
            case ClipperLib2.PolyFillType.pftNegative:
              e1Wc2 = -e1.WindCnt2;
              break;
            default:
              e1Wc2 = Math.abs(e1.WindCnt2);
              break;
          }
          switch (e2FillType2) {
            case ClipperLib2.PolyFillType.pftPositive:
              e2Wc2 = e2.WindCnt2;
              break;
            case ClipperLib2.PolyFillType.pftNegative:
              e2Wc2 = -e2.WindCnt2;
              break;
            default:
              e2Wc2 = Math.abs(e2.WindCnt2);
              break;
          }
          if (e1.PolyTyp !== e2.PolyTyp) {
            this.AddLocalMinPoly(e1, e2, pt);
          } else if (e1Wc === 1 && e2Wc === 1)
            switch (this.m_ClipType) {
              case ClipperLib2.ClipType.ctIntersection:
                if (e1Wc2 > 0 && e2Wc2 > 0)
                  this.AddLocalMinPoly(e1, e2, pt);
                break;
              case ClipperLib2.ClipType.ctUnion:
                if (e1Wc2 <= 0 && e2Wc2 <= 0)
                  this.AddLocalMinPoly(e1, e2, pt);
                break;
              case ClipperLib2.ClipType.ctDifference:
                if (e1.PolyTyp === ClipperLib2.PolyType.ptClip && e1Wc2 > 0 && e2Wc2 > 0 || e1.PolyTyp === ClipperLib2.PolyType.ptSubject && e1Wc2 <= 0 && e2Wc2 <= 0)
                  this.AddLocalMinPoly(e1, e2, pt);
                break;
              case ClipperLib2.ClipType.ctXor:
                this.AddLocalMinPoly(e1, e2, pt);
                break;
            }
          else
            ClipperLib2.Clipper.SwapSides(e1, e2);
        }
      };
      ClipperLib2.Clipper.prototype.DeleteFromSEL = function(e) {
        var SelPrev = e.PrevInSEL;
        var SelNext = e.NextInSEL;
        if (SelPrev === null && SelNext === null && e !== this.m_SortedEdges)
          return;
        if (SelPrev !== null)
          SelPrev.NextInSEL = SelNext;
        else
          this.m_SortedEdges = SelNext;
        if (SelNext !== null)
          SelNext.PrevInSEL = SelPrev;
        e.NextInSEL = null;
        e.PrevInSEL = null;
      };
      ClipperLib2.Clipper.prototype.ProcessHorizontals = function() {
        var horzEdge = {};
        while (this.PopEdgeFromSEL(horzEdge)) {
          this.ProcessHorizontal(horzEdge.v);
        }
      };
      ClipperLib2.Clipper.prototype.GetHorzDirection = function(HorzEdge, $var) {
        if (HorzEdge.Bot.X < HorzEdge.Top.X) {
          $var.Left = HorzEdge.Bot.X;
          $var.Right = HorzEdge.Top.X;
          $var.Dir = ClipperLib2.Direction.dLeftToRight;
        } else {
          $var.Left = HorzEdge.Top.X;
          $var.Right = HorzEdge.Bot.X;
          $var.Dir = ClipperLib2.Direction.dRightToLeft;
        }
      };
      ClipperLib2.Clipper.prototype.ProcessHorizontal = function(horzEdge) {
        var $var = {
          Dir: null,
          Left: null,
          Right: null
        };
        this.GetHorzDirection(horzEdge, $var);
        var dir = $var.Dir;
        var horzLeft = $var.Left;
        var horzRight = $var.Right;
        var IsOpen = horzEdge.WindDelta === 0;
        var eLastHorz = horzEdge, eMaxPair = null;
        while (eLastHorz.NextInLML !== null && ClipperLib2.ClipperBase.IsHorizontal(eLastHorz.NextInLML))
          eLastHorz = eLastHorz.NextInLML;
        if (eLastHorz.NextInLML === null)
          eMaxPair = this.GetMaximaPair(eLastHorz);
        var currMax = this.m_Maxima;
        if (currMax !== null) {
          if (dir === ClipperLib2.Direction.dLeftToRight) {
            while (currMax !== null && currMax.X <= horzEdge.Bot.X) {
              currMax = currMax.Next;
            }
            if (currMax !== null && currMax.X >= eLastHorz.Top.X) {
              currMax = null;
            }
          } else {
            while (currMax.Next !== null && currMax.Next.X < horzEdge.Bot.X) {
              currMax = currMax.Next;
            }
            if (currMax.X <= eLastHorz.Top.X) {
              currMax = null;
            }
          }
        }
        var op1 = null;
        for (; ; ) {
          var IsLastHorz = horzEdge === eLastHorz;
          var e = this.GetNextInAEL(horzEdge, dir);
          while (e !== null) {
            if (currMax !== null) {
              if (dir === ClipperLib2.Direction.dLeftToRight) {
                while (currMax !== null && currMax.X < e.Curr.X) {
                  if (horzEdge.OutIdx >= 0 && !IsOpen) {
                    this.AddOutPt(horzEdge, new ClipperLib2.IntPoint2(currMax.X, horzEdge.Bot.Y));
                  }
                  currMax = currMax.Next;
                }
              } else {
                while (currMax !== null && currMax.X > e.Curr.X) {
                  if (horzEdge.OutIdx >= 0 && !IsOpen) {
                    this.AddOutPt(horzEdge, new ClipperLib2.IntPoint2(currMax.X, horzEdge.Bot.Y));
                  }
                  currMax = currMax.Prev;
                }
              }
            }
            if (dir === ClipperLib2.Direction.dLeftToRight && e.Curr.X > horzRight || dir === ClipperLib2.Direction.dRightToLeft && e.Curr.X < horzLeft) {
              break;
            }
            if (e.Curr.X === horzEdge.Top.X && horzEdge.NextInLML !== null && e.Dx < horzEdge.NextInLML.Dx)
              break;
            if (horzEdge.OutIdx >= 0 && !IsOpen) {
              if (ClipperLib2.use_xyz) {
                if (dir === ClipperLib2.Direction.dLeftToRight)
                  this.SetZ(e.Curr, horzEdge, e);
                else this.SetZ(e.Curr, e, horzEdge);
              }
              op1 = this.AddOutPt(horzEdge, e.Curr);
              var eNextHorz = this.m_SortedEdges;
              while (eNextHorz !== null) {
                if (eNextHorz.OutIdx >= 0 && this.HorzSegmentsOverlap(horzEdge.Bot.X, horzEdge.Top.X, eNextHorz.Bot.X, eNextHorz.Top.X)) {
                  var op2 = this.GetLastOutPt(eNextHorz);
                  this.AddJoin(op2, op1, eNextHorz.Top);
                }
                eNextHorz = eNextHorz.NextInSEL;
              }
              this.AddGhostJoin(op1, horzEdge.Bot);
            }
            if (e === eMaxPair && IsLastHorz) {
              if (horzEdge.OutIdx >= 0) {
                this.AddLocalMaxPoly(horzEdge, eMaxPair, horzEdge.Top);
              }
              this.DeleteFromAEL(horzEdge);
              this.DeleteFromAEL(eMaxPair);
              return;
            }
            if (dir === ClipperLib2.Direction.dLeftToRight) {
              var Pt = new ClipperLib2.IntPoint2(e.Curr.X, horzEdge.Curr.Y);
              this.IntersectEdges(horzEdge, e, Pt);
            } else {
              var Pt = new ClipperLib2.IntPoint2(e.Curr.X, horzEdge.Curr.Y);
              this.IntersectEdges(e, horzEdge, Pt);
            }
            var eNext = this.GetNextInAEL(e, dir);
            this.SwapPositionsInAEL(horzEdge, e);
            e = eNext;
          }
          if (horzEdge.NextInLML === null || !ClipperLib2.ClipperBase.IsHorizontal(horzEdge.NextInLML)) {
            break;
          }
          horzEdge = this.UpdateEdgeIntoAEL(horzEdge);
          if (horzEdge.OutIdx >= 0) {
            this.AddOutPt(horzEdge, horzEdge.Bot);
          }
          $var = {
            Dir: dir,
            Left: horzLeft,
            Right: horzRight
          };
          this.GetHorzDirection(horzEdge, $var);
          dir = $var.Dir;
          horzLeft = $var.Left;
          horzRight = $var.Right;
        }
        if (horzEdge.OutIdx >= 0 && op1 === null) {
          op1 = this.GetLastOutPt(horzEdge);
          var eNextHorz = this.m_SortedEdges;
          while (eNextHorz !== null) {
            if (eNextHorz.OutIdx >= 0 && this.HorzSegmentsOverlap(horzEdge.Bot.X, horzEdge.Top.X, eNextHorz.Bot.X, eNextHorz.Top.X)) {
              var op2 = this.GetLastOutPt(eNextHorz);
              this.AddJoin(op2, op1, eNextHorz.Top);
            }
            eNextHorz = eNextHorz.NextInSEL;
          }
          this.AddGhostJoin(op1, horzEdge.Top);
        }
        if (horzEdge.NextInLML !== null) {
          if (horzEdge.OutIdx >= 0) {
            op1 = this.AddOutPt(horzEdge, horzEdge.Top);
            horzEdge = this.UpdateEdgeIntoAEL(horzEdge);
            if (horzEdge.WindDelta === 0) {
              return;
            }
            var ePrev = horzEdge.PrevInAEL;
            var eNext = horzEdge.NextInAEL;
            if (ePrev !== null && ePrev.Curr.X === horzEdge.Bot.X && ePrev.Curr.Y === horzEdge.Bot.Y && ePrev.WindDelta === 0 && (ePrev.OutIdx >= 0 && ePrev.Curr.Y > ePrev.Top.Y && ClipperLib2.ClipperBase.SlopesEqual3(horzEdge, ePrev, this.m_UseFullRange))) {
              var op2 = this.AddOutPt(ePrev, horzEdge.Bot);
              this.AddJoin(op1, op2, horzEdge.Top);
            } else if (eNext !== null && eNext.Curr.X === horzEdge.Bot.X && eNext.Curr.Y === horzEdge.Bot.Y && eNext.WindDelta !== 0 && eNext.OutIdx >= 0 && eNext.Curr.Y > eNext.Top.Y && ClipperLib2.ClipperBase.SlopesEqual3(horzEdge, eNext, this.m_UseFullRange)) {
              var op2 = this.AddOutPt(eNext, horzEdge.Bot);
              this.AddJoin(op1, op2, horzEdge.Top);
            }
          } else {
            horzEdge = this.UpdateEdgeIntoAEL(horzEdge);
          }
        } else {
          if (horzEdge.OutIdx >= 0) {
            this.AddOutPt(horzEdge, horzEdge.Top);
          }
          this.DeleteFromAEL(horzEdge);
        }
      };
      ClipperLib2.Clipper.prototype.GetNextInAEL = function(e, Direction) {
        return Direction === ClipperLib2.Direction.dLeftToRight ? e.NextInAEL : e.PrevInAEL;
      };
      ClipperLib2.Clipper.prototype.IsMinima = function(e) {
        return e !== null && e.Prev.NextInLML !== e && e.Next.NextInLML !== e;
      };
      ClipperLib2.Clipper.prototype.IsMaxima = function(e, Y) {
        return e !== null && e.Top.Y === Y && e.NextInLML === null;
      };
      ClipperLib2.Clipper.prototype.IsIntermediate = function(e, Y) {
        return e.Top.Y === Y && e.NextInLML !== null;
      };
      ClipperLib2.Clipper.prototype.GetMaximaPair = function(e) {
        if (ClipperLib2.IntPoint.op_Equality(e.Next.Top, e.Top) && e.Next.NextInLML === null) {
          return e.Next;
        } else {
          if (ClipperLib2.IntPoint.op_Equality(e.Prev.Top, e.Top) && e.Prev.NextInLML === null) {
            return e.Prev;
          } else {
            return null;
          }
        }
      };
      ClipperLib2.Clipper.prototype.GetMaximaPairEx = function(e) {
        var result = this.GetMaximaPair(e);
        if (result === null || result.OutIdx === ClipperLib2.ClipperBase.Skip || result.NextInAEL === result.PrevInAEL && !ClipperLib2.ClipperBase.IsHorizontal(result)) {
          return null;
        }
        return result;
      };
      ClipperLib2.Clipper.prototype.ProcessIntersections = function(topY) {
        if (this.m_ActiveEdges === null)
          return true;
        try {
          this.BuildIntersectList(topY);
          if (this.m_IntersectList.length === 0)
            return true;
          if (this.m_IntersectList.length === 1 || this.FixupIntersectionOrder())
            this.ProcessIntersectList();
          else
            return false;
        } catch ($$e2) {
          this.m_SortedEdges = null;
          this.m_IntersectList.length = 0;
          ClipperLib2.Error("ProcessIntersections error");
        }
        this.m_SortedEdges = null;
        return true;
      };
      ClipperLib2.Clipper.prototype.BuildIntersectList = function(topY) {
        if (this.m_ActiveEdges === null)
          return;
        var e = this.m_ActiveEdges;
        this.m_SortedEdges = e;
        while (e !== null) {
          e.PrevInSEL = e.PrevInAEL;
          e.NextInSEL = e.NextInAEL;
          e.Curr.X = ClipperLib2.Clipper.TopX(e, topY);
          e = e.NextInAEL;
        }
        var isModified = true;
        while (isModified && this.m_SortedEdges !== null) {
          isModified = false;
          e = this.m_SortedEdges;
          while (e.NextInSEL !== null) {
            var eNext = e.NextInSEL;
            var pt = new ClipperLib2.IntPoint0();
            if (e.Curr.X > eNext.Curr.X) {
              this.IntersectPoint(e, eNext, pt);
              if (pt.Y < topY) {
                pt = new ClipperLib2.IntPoint2(ClipperLib2.Clipper.TopX(e, topY), topY);
              }
              var newNode = new ClipperLib2.IntersectNode();
              newNode.Edge1 = e;
              newNode.Edge2 = eNext;
              newNode.Pt.X = pt.X;
              newNode.Pt.Y = pt.Y;
              if (ClipperLib2.use_xyz) newNode.Pt.Z = pt.Z;
              this.m_IntersectList.push(newNode);
              this.SwapPositionsInSEL(e, eNext);
              isModified = true;
            } else
              e = eNext;
          }
          if (e.PrevInSEL !== null)
            e.PrevInSEL.NextInSEL = null;
          else
            break;
        }
        this.m_SortedEdges = null;
      };
      ClipperLib2.Clipper.prototype.EdgesAdjacent = function(inode) {
        return inode.Edge1.NextInSEL === inode.Edge2 || inode.Edge1.PrevInSEL === inode.Edge2;
      };
      ClipperLib2.Clipper.IntersectNodeSort = function(node1, node2) {
        return node2.Pt.Y - node1.Pt.Y;
      };
      ClipperLib2.Clipper.prototype.FixupIntersectionOrder = function() {
        this.m_IntersectList.sort(this.m_IntersectNodeComparer);
        this.CopyAELToSEL();
        var cnt = this.m_IntersectList.length;
        for (var i = 0; i < cnt; i++) {
          if (!this.EdgesAdjacent(this.m_IntersectList[i])) {
            var j = i + 1;
            while (j < cnt && !this.EdgesAdjacent(this.m_IntersectList[j]))
              j++;
            if (j === cnt)
              return false;
            var tmp = this.m_IntersectList[i];
            this.m_IntersectList[i] = this.m_IntersectList[j];
            this.m_IntersectList[j] = tmp;
          }
          this.SwapPositionsInSEL(this.m_IntersectList[i].Edge1, this.m_IntersectList[i].Edge2);
        }
        return true;
      };
      ClipperLib2.Clipper.prototype.ProcessIntersectList = function() {
        for (var i = 0, ilen = this.m_IntersectList.length; i < ilen; i++) {
          var iNode = this.m_IntersectList[i];
          this.IntersectEdges(iNode.Edge1, iNode.Edge2, iNode.Pt);
          this.SwapPositionsInAEL(iNode.Edge1, iNode.Edge2);
        }
        this.m_IntersectList.length = 0;
      };
      var R1 = function(a) {
        return a < 0 ? Math.ceil(a - 0.5) : Math.round(a);
      };
      var R2 = function(a) {
        return a < 0 ? Math.ceil(a - 0.5) : Math.floor(a + 0.5);
      };
      var R3 = function(a) {
        return a < 0 ? -Math.round(Math.abs(a)) : Math.round(a);
      };
      var R4 = function(a) {
        if (a < 0) {
          a -= 0.5;
          return a < -2147483648 ? Math.ceil(a) : a | 0;
        } else {
          a += 0.5;
          return a > 2147483647 ? Math.floor(a) : a | 0;
        }
      };
      if (browser.msie) ClipperLib2.Clipper.Round = R1;
      else if (browser.chromium) ClipperLib2.Clipper.Round = R3;
      else if (browser.safari) ClipperLib2.Clipper.Round = R4;
      else ClipperLib2.Clipper.Round = R2;
      ClipperLib2.Clipper.TopX = function(edge, currentY) {
        if (currentY === edge.Top.Y)
          return edge.Top.X;
        return edge.Bot.X + ClipperLib2.Clipper.Round(edge.Dx * (currentY - edge.Bot.Y));
      };
      ClipperLib2.Clipper.prototype.IntersectPoint = function(edge1, edge2, ip) {
        ip.X = 0;
        ip.Y = 0;
        var b1, b2;
        if (edge1.Dx === edge2.Dx) {
          ip.Y = edge1.Curr.Y;
          ip.X = ClipperLib2.Clipper.TopX(edge1, ip.Y);
          return;
        }
        if (edge1.Delta.X === 0) {
          ip.X = edge1.Bot.X;
          if (ClipperLib2.ClipperBase.IsHorizontal(edge2)) {
            ip.Y = edge2.Bot.Y;
          } else {
            b2 = edge2.Bot.Y - edge2.Bot.X / edge2.Dx;
            ip.Y = ClipperLib2.Clipper.Round(ip.X / edge2.Dx + b2);
          }
        } else if (edge2.Delta.X === 0) {
          ip.X = edge2.Bot.X;
          if (ClipperLib2.ClipperBase.IsHorizontal(edge1)) {
            ip.Y = edge1.Bot.Y;
          } else {
            b1 = edge1.Bot.Y - edge1.Bot.X / edge1.Dx;
            ip.Y = ClipperLib2.Clipper.Round(ip.X / edge1.Dx + b1);
          }
        } else {
          b1 = edge1.Bot.X - edge1.Bot.Y * edge1.Dx;
          b2 = edge2.Bot.X - edge2.Bot.Y * edge2.Dx;
          var q = (b2 - b1) / (edge1.Dx - edge2.Dx);
          ip.Y = ClipperLib2.Clipper.Round(q);
          if (Math.abs(edge1.Dx) < Math.abs(edge2.Dx))
            ip.X = ClipperLib2.Clipper.Round(edge1.Dx * q + b1);
          else
            ip.X = ClipperLib2.Clipper.Round(edge2.Dx * q + b2);
        }
        if (ip.Y < edge1.Top.Y || ip.Y < edge2.Top.Y) {
          if (edge1.Top.Y > edge2.Top.Y) {
            ip.Y = edge1.Top.Y;
            ip.X = ClipperLib2.Clipper.TopX(edge2, edge1.Top.Y);
            return ip.X < edge1.Top.X;
          } else
            ip.Y = edge2.Top.Y;
          if (Math.abs(edge1.Dx) < Math.abs(edge2.Dx))
            ip.X = ClipperLib2.Clipper.TopX(edge1, ip.Y);
          else
            ip.X = ClipperLib2.Clipper.TopX(edge2, ip.Y);
        }
        if (ip.Y > edge1.Curr.Y) {
          ip.Y = edge1.Curr.Y;
          if (Math.abs(edge1.Dx) > Math.abs(edge2.Dx))
            ip.X = ClipperLib2.Clipper.TopX(edge2, ip.Y);
          else
            ip.X = ClipperLib2.Clipper.TopX(edge1, ip.Y);
        }
      };
      ClipperLib2.Clipper.prototype.ProcessEdgesAtTopOfScanbeam = function(topY) {
        var e = this.m_ActiveEdges;
        while (e !== null) {
          var IsMaximaEdge = this.IsMaxima(e, topY);
          if (IsMaximaEdge) {
            var eMaxPair = this.GetMaximaPairEx(e);
            IsMaximaEdge = eMaxPair === null || !ClipperLib2.ClipperBase.IsHorizontal(eMaxPair);
          }
          if (IsMaximaEdge) {
            if (this.StrictlySimple) {
              this.InsertMaxima(e.Top.X);
            }
            var ePrev = e.PrevInAEL;
            this.DoMaxima(e);
            if (ePrev === null)
              e = this.m_ActiveEdges;
            else
              e = ePrev.NextInAEL;
          } else {
            if (this.IsIntermediate(e, topY) && ClipperLib2.ClipperBase.IsHorizontal(e.NextInLML)) {
              e = this.UpdateEdgeIntoAEL(e);
              if (e.OutIdx >= 0)
                this.AddOutPt(e, e.Bot);
              this.AddEdgeToSEL(e);
            } else {
              e.Curr.X = ClipperLib2.Clipper.TopX(e, topY);
              e.Curr.Y = topY;
            }
            if (ClipperLib2.use_xyz) {
              if (e.Top.Y === topY) e.Curr.Z = e.Top.Z;
              else if (e.Bot.Y === topY) e.Curr.Z = e.Bot.Z;
              else e.Curr.Z = 0;
            }
            if (this.StrictlySimple) {
              var ePrev = e.PrevInAEL;
              if (e.OutIdx >= 0 && e.WindDelta !== 0 && ePrev !== null && ePrev.OutIdx >= 0 && ePrev.Curr.X === e.Curr.X && ePrev.WindDelta !== 0) {
                var ip = new ClipperLib2.IntPoint1(e.Curr);
                if (ClipperLib2.use_xyz) {
                  this.SetZ(ip, ePrev, e);
                }
                var op = this.AddOutPt(ePrev, ip);
                var op2 = this.AddOutPt(e, ip);
                this.AddJoin(op, op2, ip);
              }
            }
            e = e.NextInAEL;
          }
        }
        this.ProcessHorizontals();
        this.m_Maxima = null;
        e = this.m_ActiveEdges;
        while (e !== null) {
          if (this.IsIntermediate(e, topY)) {
            var op = null;
            if (e.OutIdx >= 0)
              op = this.AddOutPt(e, e.Top);
            e = this.UpdateEdgeIntoAEL(e);
            var ePrev = e.PrevInAEL;
            var eNext = e.NextInAEL;
            if (ePrev !== null && ePrev.Curr.X === e.Bot.X && ePrev.Curr.Y === e.Bot.Y && op !== null && ePrev.OutIdx >= 0 && ePrev.Curr.Y === ePrev.Top.Y && ClipperLib2.ClipperBase.SlopesEqual5(e.Curr, e.Top, ePrev.Curr, ePrev.Top, this.m_UseFullRange) && e.WindDelta !== 0 && ePrev.WindDelta !== 0) {
              var op2 = this.AddOutPt(ePrev2, e.Bot);
              this.AddJoin(op, op2, e.Top);
            } else if (eNext !== null && eNext.Curr.X === e.Bot.X && eNext.Curr.Y === e.Bot.Y && op !== null && eNext.OutIdx >= 0 && eNext.Curr.Y === eNext.Top.Y && ClipperLib2.ClipperBase.SlopesEqual5(e.Curr, e.Top, eNext.Curr, eNext.Top, this.m_UseFullRange) && e.WindDelta !== 0 && eNext.WindDelta !== 0) {
              var op2 = this.AddOutPt(eNext, e.Bot);
              this.AddJoin(op, op2, e.Top);
            }
          }
          e = e.NextInAEL;
        }
      };
      ClipperLib2.Clipper.prototype.DoMaxima = function(e) {
        var eMaxPair = this.GetMaximaPairEx(e);
        if (eMaxPair === null) {
          if (e.OutIdx >= 0)
            this.AddOutPt(e, e.Top);
          this.DeleteFromAEL(e);
          return;
        }
        var eNext = e.NextInAEL;
        while (eNext !== null && eNext !== eMaxPair) {
          this.IntersectEdges(e, eNext, e.Top);
          this.SwapPositionsInAEL(e, eNext);
          eNext = e.NextInAEL;
        }
        if (e.OutIdx === -1 && eMaxPair.OutIdx === -1) {
          this.DeleteFromAEL(e);
          this.DeleteFromAEL(eMaxPair);
        } else if (e.OutIdx >= 0 && eMaxPair.OutIdx >= 0) {
          if (e.OutIdx >= 0) this.AddLocalMaxPoly(e, eMaxPair, e.Top);
          this.DeleteFromAEL(e);
          this.DeleteFromAEL(eMaxPair);
        } else if (ClipperLib2.use_lines && e.WindDelta === 0) {
          if (e.OutIdx >= 0) {
            this.AddOutPt(e, e.Top);
            e.OutIdx = ClipperLib2.ClipperBase.Unassigned;
          }
          this.DeleteFromAEL(e);
          if (eMaxPair.OutIdx >= 0) {
            this.AddOutPt(eMaxPair, e.Top);
            eMaxPair.OutIdx = ClipperLib2.ClipperBase.Unassigned;
          }
          this.DeleteFromAEL(eMaxPair);
        } else
          ClipperLib2.Error("DoMaxima error");
      };
      ClipperLib2.Clipper.ReversePaths = function(polys) {
        for (var i = 0, len = polys.length; i < len; i++)
          polys[i].reverse();
      };
      ClipperLib2.Clipper.Orientation = function(poly) {
        return ClipperLib2.Clipper.Area(poly) >= 0;
      };
      ClipperLib2.Clipper.prototype.PointCount = function(pts) {
        if (pts === null)
          return 0;
        var result = 0;
        var p = pts;
        do {
          result++;
          p = p.Next;
        } while (p !== pts);
        return result;
      };
      ClipperLib2.Clipper.prototype.BuildResult = function(polyg) {
        ClipperLib2.Clear(polyg);
        for (var i = 0, ilen = this.m_PolyOuts.length; i < ilen; i++) {
          var outRec = this.m_PolyOuts[i];
          if (outRec.Pts === null)
            continue;
          var p = outRec.Pts.Prev;
          var cnt = this.PointCount(p);
          if (cnt < 2)
            continue;
          var pg = new Array(cnt);
          for (var j = 0; j < cnt; j++) {
            pg[j] = p.Pt;
            p = p.Prev;
          }
          polyg.push(pg);
        }
      };
      ClipperLib2.Clipper.prototype.BuildResult2 = function(polytree) {
        polytree.Clear();
        for (var i = 0, ilen = this.m_PolyOuts.length; i < ilen; i++) {
          var outRec = this.m_PolyOuts[i];
          var cnt = this.PointCount(outRec.Pts);
          if (outRec.IsOpen && cnt < 2 || !outRec.IsOpen && cnt < 3)
            continue;
          this.FixHoleLinkage(outRec);
          var pn = new ClipperLib2.PolyNode();
          polytree.m_AllPolys.push(pn);
          outRec.PolyNode = pn;
          pn.m_polygon.length = cnt;
          var op = outRec.Pts.Prev;
          for (var j = 0; j < cnt; j++) {
            pn.m_polygon[j] = op.Pt;
            op = op.Prev;
          }
        }
        for (var i = 0, ilen = this.m_PolyOuts.length; i < ilen; i++) {
          var outRec = this.m_PolyOuts[i];
          if (outRec.PolyNode === null)
            continue;
          else if (outRec.IsOpen) {
            outRec.PolyNode.IsOpen = true;
            polytree.AddChild(outRec.PolyNode);
          } else if (outRec.FirstLeft !== null && outRec.FirstLeft.PolyNode !== null)
            outRec.FirstLeft.PolyNode.AddChild(outRec.PolyNode);
          else
            polytree.AddChild(outRec.PolyNode);
        }
      };
      ClipperLib2.Clipper.prototype.FixupOutPolyline = function(outRec) {
        var pp = outRec.Pts;
        var lastPP = pp.Prev;
        while (pp !== lastPP) {
          pp = pp.Next;
          if (ClipperLib2.IntPoint.op_Equality(pp.Pt, pp.Prev.Pt)) {
            if (pp === lastPP) {
              lastPP = pp.Prev;
            }
            var tmpPP = pp.Prev;
            tmpPP.Next = pp.Next;
            pp.Next.Prev = tmpPP;
            pp = tmpPP;
          }
        }
        if (pp === pp.Prev) {
          outRec.Pts = null;
        }
      };
      ClipperLib2.Clipper.prototype.FixupOutPolygon = function(outRec) {
        var lastOK = null;
        outRec.BottomPt = null;
        var pp = outRec.Pts;
        var preserveCol = this.PreserveCollinear || this.StrictlySimple;
        for (; ; ) {
          if (pp.Prev === pp || pp.Prev === pp.Next) {
            outRec.Pts = null;
            return;
          }
          if (ClipperLib2.IntPoint.op_Equality(pp.Pt, pp.Next.Pt) || ClipperLib2.IntPoint.op_Equality(pp.Pt, pp.Prev.Pt) || ClipperLib2.ClipperBase.SlopesEqual4(pp.Prev.Pt, pp.Pt, pp.Next.Pt, this.m_UseFullRange) && (!preserveCol || !this.Pt2IsBetweenPt1AndPt3(pp.Prev.Pt, pp.Pt, pp.Next.Pt))) {
            lastOK = null;
            pp.Prev.Next = pp.Next;
            pp.Next.Prev = pp.Prev;
            pp = pp.Prev;
          } else if (pp === lastOK)
            break;
          else {
            if (lastOK === null)
              lastOK = pp;
            pp = pp.Next;
          }
        }
        outRec.Pts = pp;
      };
      ClipperLib2.Clipper.prototype.DupOutPt = function(outPt, InsertAfter) {
        var result = new ClipperLib2.OutPt();
        result.Pt.X = outPt.Pt.X;
        result.Pt.Y = outPt.Pt.Y;
        if (ClipperLib2.use_xyz) result.Pt.Z = outPt.Pt.Z;
        result.Idx = outPt.Idx;
        if (InsertAfter) {
          result.Next = outPt.Next;
          result.Prev = outPt;
          outPt.Next.Prev = result;
          outPt.Next = result;
        } else {
          result.Prev = outPt.Prev;
          result.Next = outPt;
          outPt.Prev.Next = result;
          outPt.Prev = result;
        }
        return result;
      };
      ClipperLib2.Clipper.prototype.GetOverlap = function(a1, a2, b1, b2, $val) {
        if (a1 < a2) {
          if (b1 < b2) {
            $val.Left = Math.max(a1, b1);
            $val.Right = Math.min(a2, b2);
          } else {
            $val.Left = Math.max(a1, b2);
            $val.Right = Math.min(a2, b1);
          }
        } else {
          if (b1 < b2) {
            $val.Left = Math.max(a2, b1);
            $val.Right = Math.min(a1, b2);
          } else {
            $val.Left = Math.max(a2, b2);
            $val.Right = Math.min(a1, b1);
          }
        }
        return $val.Left < $val.Right;
      };
      ClipperLib2.Clipper.prototype.JoinHorz = function(op1, op1b, op2, op2b, Pt, DiscardLeft) {
        var Dir1 = op1.Pt.X > op1b.Pt.X ? ClipperLib2.Direction.dRightToLeft : ClipperLib2.Direction.dLeftToRight;
        var Dir2 = op2.Pt.X > op2b.Pt.X ? ClipperLib2.Direction.dRightToLeft : ClipperLib2.Direction.dLeftToRight;
        if (Dir1 === Dir2)
          return false;
        if (Dir1 === ClipperLib2.Direction.dLeftToRight) {
          while (op1.Next.Pt.X <= Pt.X && op1.Next.Pt.X >= op1.Pt.X && op1.Next.Pt.Y === Pt.Y)
            op1 = op1.Next;
          if (DiscardLeft && op1.Pt.X !== Pt.X)
            op1 = op1.Next;
          op1b = this.DupOutPt(op1, !DiscardLeft);
          if (ClipperLib2.IntPoint.op_Inequality(op1b.Pt, Pt)) {
            op1 = op1b;
            op1.Pt.X = Pt.X;
            op1.Pt.Y = Pt.Y;
            if (ClipperLib2.use_xyz) op1.Pt.Z = Pt.Z;
            op1b = this.DupOutPt(op1, !DiscardLeft);
          }
        } else {
          while (op1.Next.Pt.X >= Pt.X && op1.Next.Pt.X <= op1.Pt.X && op1.Next.Pt.Y === Pt.Y)
            op1 = op1.Next;
          if (!DiscardLeft && op1.Pt.X !== Pt.X)
            op1 = op1.Next;
          op1b = this.DupOutPt(op1, DiscardLeft);
          if (ClipperLib2.IntPoint.op_Inequality(op1b.Pt, Pt)) {
            op1 = op1b;
            op1.Pt.X = Pt.X;
            op1.Pt.Y = Pt.Y;
            if (ClipperLib2.use_xyz) op1.Pt.Z = Pt.Z;
            op1b = this.DupOutPt(op1, DiscardLeft);
          }
        }
        if (Dir2 === ClipperLib2.Direction.dLeftToRight) {
          while (op2.Next.Pt.X <= Pt.X && op2.Next.Pt.X >= op2.Pt.X && op2.Next.Pt.Y === Pt.Y)
            op2 = op2.Next;
          if (DiscardLeft && op2.Pt.X !== Pt.X)
            op2 = op2.Next;
          op2b = this.DupOutPt(op2, !DiscardLeft);
          if (ClipperLib2.IntPoint.op_Inequality(op2b.Pt, Pt)) {
            op2 = op2b;
            op2.Pt.X = Pt.X;
            op2.Pt.Y = Pt.Y;
            if (ClipperLib2.use_xyz) op2.Pt.Z = Pt.Z;
            op2b = this.DupOutPt(op2, !DiscardLeft);
          }
        } else {
          while (op2.Next.Pt.X >= Pt.X && op2.Next.Pt.X <= op2.Pt.X && op2.Next.Pt.Y === Pt.Y)
            op2 = op2.Next;
          if (!DiscardLeft && op2.Pt.X !== Pt.X)
            op2 = op2.Next;
          op2b = this.DupOutPt(op2, DiscardLeft);
          if (ClipperLib2.IntPoint.op_Inequality(op2b.Pt, Pt)) {
            op2 = op2b;
            op2.Pt.X = Pt.X;
            op2.Pt.Y = Pt.Y;
            if (ClipperLib2.use_xyz) op2.Pt.Z = Pt.Z;
            op2b = this.DupOutPt(op2, DiscardLeft);
          }
        }
        if (Dir1 === ClipperLib2.Direction.dLeftToRight === DiscardLeft) {
          op1.Prev = op2;
          op2.Next = op1;
          op1b.Next = op2b;
          op2b.Prev = op1b;
        } else {
          op1.Next = op2;
          op2.Prev = op1;
          op1b.Prev = op2b;
          op2b.Next = op1b;
        }
        return true;
      };
      ClipperLib2.Clipper.prototype.JoinPoints = function(j, outRec1, outRec2) {
        var op1 = j.OutPt1, op1b = new ClipperLib2.OutPt();
        var op2 = j.OutPt2, op2b = new ClipperLib2.OutPt();
        var isHorizontal = j.OutPt1.Pt.Y === j.OffPt.Y;
        if (isHorizontal && ClipperLib2.IntPoint.op_Equality(j.OffPt, j.OutPt1.Pt) && ClipperLib2.IntPoint.op_Equality(j.OffPt, j.OutPt2.Pt)) {
          if (outRec1 !== outRec2) return false;
          op1b = j.OutPt1.Next;
          while (op1b !== op1 && ClipperLib2.IntPoint.op_Equality(op1b.Pt, j.OffPt))
            op1b = op1b.Next;
          var reverse1 = op1b.Pt.Y > j.OffPt.Y;
          op2b = j.OutPt2.Next;
          while (op2b !== op2 && ClipperLib2.IntPoint.op_Equality(op2b.Pt, j.OffPt))
            op2b = op2b.Next;
          var reverse2 = op2b.Pt.Y > j.OffPt.Y;
          if (reverse1 === reverse2)
            return false;
          if (reverse1) {
            op1b = this.DupOutPt(op1, false);
            op2b = this.DupOutPt(op2, true);
            op1.Prev = op2;
            op2.Next = op1;
            op1b.Next = op2b;
            op2b.Prev = op1b;
            j.OutPt1 = op1;
            j.OutPt2 = op1b;
            return true;
          } else {
            op1b = this.DupOutPt(op1, true);
            op2b = this.DupOutPt(op2, false);
            op1.Next = op2;
            op2.Prev = op1;
            op1b.Prev = op2b;
            op2b.Next = op1b;
            j.OutPt1 = op1;
            j.OutPt2 = op1b;
            return true;
          }
        } else if (isHorizontal) {
          op1b = op1;
          while (op1.Prev.Pt.Y === op1.Pt.Y && op1.Prev !== op1b && op1.Prev !== op2)
            op1 = op1.Prev;
          while (op1b.Next.Pt.Y === op1b.Pt.Y && op1b.Next !== op1 && op1b.Next !== op2)
            op1b = op1b.Next;
          if (op1b.Next === op1 || op1b.Next === op2)
            return false;
          op2b = op2;
          while (op2.Prev.Pt.Y === op2.Pt.Y && op2.Prev !== op2b && op2.Prev !== op1b)
            op2 = op2.Prev;
          while (op2b.Next.Pt.Y === op2b.Pt.Y && op2b.Next !== op2 && op2b.Next !== op1)
            op2b = op2b.Next;
          if (op2b.Next === op2 || op2b.Next === op1)
            return false;
          var $val = {
            Left: null,
            Right: null
          };
          if (!this.GetOverlap(op1.Pt.X, op1b.Pt.X, op2.Pt.X, op2b.Pt.X, $val))
            return false;
          var Left = $val.Left;
          var Right = $val.Right;
          var Pt = new ClipperLib2.IntPoint0();
          var DiscardLeftSide;
          if (op1.Pt.X >= Left && op1.Pt.X <= Right) {
            Pt.X = op1.Pt.X;
            Pt.Y = op1.Pt.Y;
            if (ClipperLib2.use_xyz) Pt.Z = op1.Pt.Z;
            DiscardLeftSide = op1.Pt.X > op1b.Pt.X;
          } else if (op2.Pt.X >= Left && op2.Pt.X <= Right) {
            Pt.X = op2.Pt.X;
            Pt.Y = op2.Pt.Y;
            if (ClipperLib2.use_xyz) Pt.Z = op2.Pt.Z;
            DiscardLeftSide = op2.Pt.X > op2b.Pt.X;
          } else if (op1b.Pt.X >= Left && op1b.Pt.X <= Right) {
            Pt.X = op1b.Pt.X;
            Pt.Y = op1b.Pt.Y;
            if (ClipperLib2.use_xyz) Pt.Z = op1b.Pt.Z;
            DiscardLeftSide = op1b.Pt.X > op1.Pt.X;
          } else {
            Pt.X = op2b.Pt.X;
            Pt.Y = op2b.Pt.Y;
            if (ClipperLib2.use_xyz) Pt.Z = op2b.Pt.Z;
            DiscardLeftSide = op2b.Pt.X > op2.Pt.X;
          }
          j.OutPt1 = op1;
          j.OutPt2 = op2;
          return this.JoinHorz(op1, op1b, op2, op2b, Pt, DiscardLeftSide);
        } else {
          op1b = op1.Next;
          while (ClipperLib2.IntPoint.op_Equality(op1b.Pt, op1.Pt) && op1b !== op1)
            op1b = op1b.Next;
          var Reverse1 = op1b.Pt.Y > op1.Pt.Y || !ClipperLib2.ClipperBase.SlopesEqual4(op1.Pt, op1b.Pt, j.OffPt, this.m_UseFullRange);
          if (Reverse1) {
            op1b = op1.Prev;
            while (ClipperLib2.IntPoint.op_Equality(op1b.Pt, op1.Pt) && op1b !== op1)
              op1b = op1b.Prev;
            if (op1b.Pt.Y > op1.Pt.Y || !ClipperLib2.ClipperBase.SlopesEqual4(op1.Pt, op1b.Pt, j.OffPt, this.m_UseFullRange))
              return false;
          }
          op2b = op2.Next;
          while (ClipperLib2.IntPoint.op_Equality(op2b.Pt, op2.Pt) && op2b !== op2)
            op2b = op2b.Next;
          var Reverse2 = op2b.Pt.Y > op2.Pt.Y || !ClipperLib2.ClipperBase.SlopesEqual4(op2.Pt, op2b.Pt, j.OffPt, this.m_UseFullRange);
          if (Reverse2) {
            op2b = op2.Prev;
            while (ClipperLib2.IntPoint.op_Equality(op2b.Pt, op2.Pt) && op2b !== op2)
              op2b = op2b.Prev;
            if (op2b.Pt.Y > op2.Pt.Y || !ClipperLib2.ClipperBase.SlopesEqual4(op2.Pt, op2b.Pt, j.OffPt, this.m_UseFullRange))
              return false;
          }
          if (op1b === op1 || op2b === op2 || op1b === op2b || outRec1 === outRec2 && Reverse1 === Reverse2)
            return false;
          if (Reverse1) {
            op1b = this.DupOutPt(op1, false);
            op2b = this.DupOutPt(op2, true);
            op1.Prev = op2;
            op2.Next = op1;
            op1b.Next = op2b;
            op2b.Prev = op1b;
            j.OutPt1 = op1;
            j.OutPt2 = op1b;
            return true;
          } else {
            op1b = this.DupOutPt(op1, true);
            op2b = this.DupOutPt(op2, false);
            op1.Next = op2;
            op2.Prev = op1;
            op1b.Prev = op2b;
            op2b.Next = op1b;
            j.OutPt1 = op1;
            j.OutPt2 = op1b;
            return true;
          }
        }
      };
      ClipperLib2.Clipper.GetBounds = function(paths) {
        var i = 0, cnt = paths.length;
        while (i < cnt && paths[i].length === 0) i++;
        if (i === cnt) return new ClipperLib2.IntRect(0, 0, 0, 0);
        var result = new ClipperLib2.IntRect();
        result.left = paths[i][0].X;
        result.right = result.left;
        result.top = paths[i][0].Y;
        result.bottom = result.top;
        for (; i < cnt; i++)
          for (var j = 0, jlen = paths[i].length; j < jlen; j++) {
            if (paths[i][j].X < result.left) result.left = paths[i][j].X;
            else if (paths[i][j].X > result.right) result.right = paths[i][j].X;
            if (paths[i][j].Y < result.top) result.top = paths[i][j].Y;
            else if (paths[i][j].Y > result.bottom) result.bottom = paths[i][j].Y;
          }
        return result;
      };
      ClipperLib2.Clipper.prototype.GetBounds2 = function(ops) {
        var opStart = ops;
        var result = new ClipperLib2.IntRect();
        result.left = ops.Pt.X;
        result.right = ops.Pt.X;
        result.top = ops.Pt.Y;
        result.bottom = ops.Pt.Y;
        ops = ops.Next;
        while (ops !== opStart) {
          if (ops.Pt.X < result.left)
            result.left = ops.Pt.X;
          if (ops.Pt.X > result.right)
            result.right = ops.Pt.X;
          if (ops.Pt.Y < result.top)
            result.top = ops.Pt.Y;
          if (ops.Pt.Y > result.bottom)
            result.bottom = ops.Pt.Y;
          ops = ops.Next;
        }
        return result;
      };
      ClipperLib2.Clipper.PointInPolygon = function(pt, path2) {
        var result = 0, cnt = path2.length;
        if (cnt < 3)
          return 0;
        var ip = path2[0];
        for (var i = 1; i <= cnt; ++i) {
          var ipNext = i === cnt ? path2[0] : path2[i];
          if (ipNext.Y === pt.Y) {
            if (ipNext.X === pt.X || ip.Y === pt.Y && ipNext.X > pt.X === ip.X < pt.X)
              return -1;
          }
          if (ip.Y < pt.Y !== ipNext.Y < pt.Y) {
            if (ip.X >= pt.X) {
              if (ipNext.X > pt.X)
                result = 1 - result;
              else {
                var d = (ip.X - pt.X) * (ipNext.Y - pt.Y) - (ipNext.X - pt.X) * (ip.Y - pt.Y);
                if (d === 0)
                  return -1;
                else if (d > 0 === ipNext.Y > ip.Y)
                  result = 1 - result;
              }
            } else {
              if (ipNext.X > pt.X) {
                var d = (ip.X - pt.X) * (ipNext.Y - pt.Y) - (ipNext.X - pt.X) * (ip.Y - pt.Y);
                if (d === 0)
                  return -1;
                else if (d > 0 === ipNext.Y > ip.Y)
                  result = 1 - result;
              }
            }
          }
          ip = ipNext;
        }
        return result;
      };
      ClipperLib2.Clipper.prototype.PointInPolygon = function(pt, op) {
        var result = 0;
        var startOp = op;
        var ptx = pt.X, pty = pt.Y;
        var poly0x = op.Pt.X, poly0y = op.Pt.Y;
        do {
          op = op.Next;
          var poly1x = op.Pt.X, poly1y = op.Pt.Y;
          if (poly1y === pty) {
            if (poly1x === ptx || poly0y === pty && poly1x > ptx === poly0x < ptx)
              return -1;
          }
          if (poly0y < pty !== poly1y < pty) {
            if (poly0x >= ptx) {
              if (poly1x > ptx)
                result = 1 - result;
              else {
                var d = (poly0x - ptx) * (poly1y - pty) - (poly1x - ptx) * (poly0y - pty);
                if (d === 0)
                  return -1;
                if (d > 0 === poly1y > poly0y)
                  result = 1 - result;
              }
            } else {
              if (poly1x > ptx) {
                var d = (poly0x - ptx) * (poly1y - pty) - (poly1x - ptx) * (poly0y - pty);
                if (d === 0)
                  return -1;
                if (d > 0 === poly1y > poly0y)
                  result = 1 - result;
              }
            }
          }
          poly0x = poly1x;
          poly0y = poly1y;
        } while (startOp !== op);
        return result;
      };
      ClipperLib2.Clipper.prototype.Poly2ContainsPoly1 = function(outPt1, outPt2) {
        var op = outPt1;
        do {
          var res = this.PointInPolygon(op.Pt, outPt2);
          if (res >= 0)
            return res > 0;
          op = op.Next;
        } while (op !== outPt1);
        return true;
      };
      ClipperLib2.Clipper.prototype.FixupFirstLefts1 = function(OldOutRec, NewOutRec) {
        var outRec, firstLeft;
        for (var i = 0, ilen = this.m_PolyOuts.length; i < ilen; i++) {
          outRec = this.m_PolyOuts[i];
          firstLeft = ClipperLib2.Clipper.ParseFirstLeft(outRec.FirstLeft);
          if (outRec.Pts !== null && firstLeft === OldOutRec) {
            if (this.Poly2ContainsPoly1(outRec.Pts, NewOutRec.Pts))
              outRec.FirstLeft = NewOutRec;
          }
        }
      };
      ClipperLib2.Clipper.prototype.FixupFirstLefts2 = function(innerOutRec, outerOutRec) {
        var orfl = outerOutRec.FirstLeft;
        var outRec, firstLeft;
        for (var i = 0, ilen = this.m_PolyOuts.length; i < ilen; i++) {
          outRec = this.m_PolyOuts[i];
          if (outRec.Pts === null || outRec === outerOutRec || outRec === innerOutRec)
            continue;
          firstLeft = ClipperLib2.Clipper.ParseFirstLeft(outRec.FirstLeft);
          if (firstLeft !== orfl && firstLeft !== innerOutRec && firstLeft !== outerOutRec)
            continue;
          if (this.Poly2ContainsPoly1(outRec.Pts, innerOutRec.Pts))
            outRec.FirstLeft = innerOutRec;
          else if (this.Poly2ContainsPoly1(outRec.Pts, outerOutRec.Pts))
            outRec.FirstLeft = outerOutRec;
          else if (outRec.FirstLeft === innerOutRec || outRec.FirstLeft === outerOutRec)
            outRec.FirstLeft = orfl;
        }
      };
      ClipperLib2.Clipper.prototype.FixupFirstLefts3 = function(OldOutRec, NewOutRec) {
        var outRec;
        var firstLeft;
        for (var i = 0, ilen = this.m_PolyOuts.length; i < ilen; i++) {
          outRec = this.m_PolyOuts[i];
          firstLeft = ClipperLib2.Clipper.ParseFirstLeft(outRec.FirstLeft);
          if (outRec.Pts !== null && firstLeft === OldOutRec)
            outRec.FirstLeft = NewOutRec;
        }
      };
      ClipperLib2.Clipper.ParseFirstLeft = function(FirstLeft) {
        while (FirstLeft !== null && FirstLeft.Pts === null)
          FirstLeft = FirstLeft.FirstLeft;
        return FirstLeft;
      };
      ClipperLib2.Clipper.prototype.JoinCommonEdges = function() {
        for (var i = 0, ilen = this.m_Joins.length; i < ilen; i++) {
          var join = this.m_Joins[i];
          var outRec1 = this.GetOutRec(join.OutPt1.Idx);
          var outRec2 = this.GetOutRec(join.OutPt2.Idx);
          if (outRec1.Pts === null || outRec2.Pts === null)
            continue;
          if (outRec1.IsOpen || outRec2.IsOpen) {
            continue;
          }
          var holeStateRec;
          if (outRec1 === outRec2)
            holeStateRec = outRec1;
          else if (this.OutRec1RightOfOutRec2(outRec1, outRec2))
            holeStateRec = outRec2;
          else if (this.OutRec1RightOfOutRec2(outRec2, outRec1))
            holeStateRec = outRec1;
          else
            holeStateRec = this.GetLowermostRec(outRec1, outRec2);
          if (!this.JoinPoints(join, outRec1, outRec2)) continue;
          if (outRec1 === outRec2) {
            outRec1.Pts = join.OutPt1;
            outRec1.BottomPt = null;
            outRec2 = this.CreateOutRec();
            outRec2.Pts = join.OutPt2;
            this.UpdateOutPtIdxs(outRec2);
            if (this.Poly2ContainsPoly1(outRec2.Pts, outRec1.Pts)) {
              outRec2.IsHole = !outRec1.IsHole;
              outRec2.FirstLeft = outRec1;
              if (this.m_UsingPolyTree)
                this.FixupFirstLefts2(outRec2, outRec1);
              if ((outRec2.IsHole ^ this.ReverseSolution) == this.Area$1(outRec2) > 0)
                this.ReversePolyPtLinks(outRec2.Pts);
            } else if (this.Poly2ContainsPoly1(outRec1.Pts, outRec2.Pts)) {
              outRec2.IsHole = outRec1.IsHole;
              outRec1.IsHole = !outRec2.IsHole;
              outRec2.FirstLeft = outRec1.FirstLeft;
              outRec1.FirstLeft = outRec2;
              if (this.m_UsingPolyTree)
                this.FixupFirstLefts2(outRec1, outRec2);
              if ((outRec1.IsHole ^ this.ReverseSolution) == this.Area$1(outRec1) > 0)
                this.ReversePolyPtLinks(outRec1.Pts);
            } else {
              outRec2.IsHole = outRec1.IsHole;
              outRec2.FirstLeft = outRec1.FirstLeft;
              if (this.m_UsingPolyTree)
                this.FixupFirstLefts1(outRec1, outRec2);
            }
          } else {
            outRec2.Pts = null;
            outRec2.BottomPt = null;
            outRec2.Idx = outRec1.Idx;
            outRec1.IsHole = holeStateRec.IsHole;
            if (holeStateRec === outRec2)
              outRec1.FirstLeft = outRec2.FirstLeft;
            outRec2.FirstLeft = outRec1;
            if (this.m_UsingPolyTree)
              this.FixupFirstLefts3(outRec2, outRec1);
          }
        }
      };
      ClipperLib2.Clipper.prototype.UpdateOutPtIdxs = function(outrec) {
        var op = outrec.Pts;
        do {
          op.Idx = outrec.Idx;
          op = op.Prev;
        } while (op !== outrec.Pts);
      };
      ClipperLib2.Clipper.prototype.DoSimplePolygons = function() {
        var i = 0;
        while (i < this.m_PolyOuts.length) {
          var outrec = this.m_PolyOuts[i++];
          var op = outrec.Pts;
          if (op === null || outrec.IsOpen)
            continue;
          do {
            var op2 = op.Next;
            while (op2 !== outrec.Pts) {
              if (ClipperLib2.IntPoint.op_Equality(op.Pt, op2.Pt) && op2.Next !== op && op2.Prev !== op) {
                var op3 = op.Prev;
                var op4 = op2.Prev;
                op.Prev = op4;
                op4.Next = op;
                op2.Prev = op3;
                op3.Next = op2;
                outrec.Pts = op;
                var outrec2 = this.CreateOutRec();
                outrec2.Pts = op2;
                this.UpdateOutPtIdxs(outrec2);
                if (this.Poly2ContainsPoly1(outrec2.Pts, outrec.Pts)) {
                  outrec2.IsHole = !outrec.IsHole;
                  outrec2.FirstLeft = outrec;
                  if (this.m_UsingPolyTree) this.FixupFirstLefts2(outrec2, outrec);
                } else if (this.Poly2ContainsPoly1(outrec.Pts, outrec2.Pts)) {
                  outrec2.IsHole = outrec.IsHole;
                  outrec.IsHole = !outrec2.IsHole;
                  outrec2.FirstLeft = outrec.FirstLeft;
                  outrec.FirstLeft = outrec2;
                  if (this.m_UsingPolyTree) this.FixupFirstLefts2(outrec, outrec2);
                } else {
                  outrec2.IsHole = outrec.IsHole;
                  outrec2.FirstLeft = outrec.FirstLeft;
                  if (this.m_UsingPolyTree) this.FixupFirstLefts1(outrec, outrec2);
                }
                op2 = op;
              }
              op2 = op2.Next;
            }
            op = op.Next;
          } while (op !== outrec.Pts);
        }
      };
      ClipperLib2.Clipper.Area = function(poly) {
        if (!Array.isArray(poly))
          return 0;
        var cnt = poly.length;
        if (cnt < 3)
          return 0;
        var a = 0;
        for (var i = 0, j = cnt - 1; i < cnt; ++i) {
          a += (poly[j].X + poly[i].X) * (poly[j].Y - poly[i].Y);
          j = i;
        }
        return -a * 0.5;
      };
      ClipperLib2.Clipper.prototype.Area = function(op) {
        var opFirst = op;
        if (op === null) return 0;
        var a = 0;
        do {
          a = a + (op.Prev.Pt.X + op.Pt.X) * (op.Prev.Pt.Y - op.Pt.Y);
          op = op.Next;
        } while (op !== opFirst);
        return a * 0.5;
      };
      ClipperLib2.Clipper.prototype.Area$1 = function(outRec) {
        return this.Area(outRec.Pts);
      };
      ClipperLib2.Clipper.SimplifyPolygon = function(poly, fillType) {
        var result = new Array();
        var c = new ClipperLib2.Clipper(0);
        c.StrictlySimple = true;
        c.AddPath(poly, ClipperLib2.PolyType.ptSubject, true);
        c.Execute(ClipperLib2.ClipType.ctUnion, result, fillType, fillType);
        return result;
      };
      ClipperLib2.Clipper.SimplifyPolygons = function(polys, fillType) {
        if (typeof fillType === "undefined") fillType = ClipperLib2.PolyFillType.pftEvenOdd;
        var result = new Array();
        var c = new ClipperLib2.Clipper(0);
        c.StrictlySimple = true;
        c.AddPaths(polys, ClipperLib2.PolyType.ptSubject, true);
        c.Execute(ClipperLib2.ClipType.ctUnion, result, fillType, fillType);
        return result;
      };
      ClipperLib2.Clipper.DistanceSqrd = function(pt1, pt2) {
        var dx = pt1.X - pt2.X;
        var dy = pt1.Y - pt2.Y;
        return dx * dx + dy * dy;
      };
      ClipperLib2.Clipper.DistanceFromLineSqrd = function(pt, ln1, ln2) {
        var A = ln1.Y - ln2.Y;
        var B = ln2.X - ln1.X;
        var C = A * ln1.X + B * ln1.Y;
        C = A * pt.X + B * pt.Y - C;
        return C * C / (A * A + B * B);
      };
      ClipperLib2.Clipper.SlopesNearCollinear = function(pt1, pt2, pt3, distSqrd) {
        if (Math.abs(pt1.X - pt2.X) > Math.abs(pt1.Y - pt2.Y)) {
          if (pt1.X > pt2.X === pt1.X < pt3.X)
            return ClipperLib2.Clipper.DistanceFromLineSqrd(pt1, pt2, pt3) < distSqrd;
          else if (pt2.X > pt1.X === pt2.X < pt3.X)
            return ClipperLib2.Clipper.DistanceFromLineSqrd(pt2, pt1, pt3) < distSqrd;
          else
            return ClipperLib2.Clipper.DistanceFromLineSqrd(pt3, pt1, pt2) < distSqrd;
        } else {
          if (pt1.Y > pt2.Y === pt1.Y < pt3.Y)
            return ClipperLib2.Clipper.DistanceFromLineSqrd(pt1, pt2, pt3) < distSqrd;
          else if (pt2.Y > pt1.Y === pt2.Y < pt3.Y)
            return ClipperLib2.Clipper.DistanceFromLineSqrd(pt2, pt1, pt3) < distSqrd;
          else
            return ClipperLib2.Clipper.DistanceFromLineSqrd(pt3, pt1, pt2) < distSqrd;
        }
      };
      ClipperLib2.Clipper.PointsAreClose = function(pt1, pt2, distSqrd) {
        var dx = pt1.X - pt2.X;
        var dy = pt1.Y - pt2.Y;
        return dx * dx + dy * dy <= distSqrd;
      };
      ClipperLib2.Clipper.ExcludeOp = function(op) {
        var result = op.Prev;
        result.Next = op.Next;
        op.Next.Prev = result;
        result.Idx = 0;
        return result;
      };
      ClipperLib2.Clipper.CleanPolygon = function(path2, distance) {
        if (typeof distance === "undefined") distance = 1.415;
        var cnt = path2.length;
        if (cnt === 0)
          return new Array();
        var outPts = new Array(cnt);
        for (var i = 0; i < cnt; ++i)
          outPts[i] = new ClipperLib2.OutPt();
        for (var i = 0; i < cnt; ++i) {
          outPts[i].Pt = path2[i];
          outPts[i].Next = outPts[(i + 1) % cnt];
          outPts[i].Next.Prev = outPts[i];
          outPts[i].Idx = 0;
        }
        var distSqrd = distance * distance;
        var op = outPts[0];
        while (op.Idx === 0 && op.Next !== op.Prev) {
          if (ClipperLib2.Clipper.PointsAreClose(op.Pt, op.Prev.Pt, distSqrd)) {
            op = ClipperLib2.Clipper.ExcludeOp(op);
            cnt--;
          } else if (ClipperLib2.Clipper.PointsAreClose(op.Prev.Pt, op.Next.Pt, distSqrd)) {
            ClipperLib2.Clipper.ExcludeOp(op.Next);
            op = ClipperLib2.Clipper.ExcludeOp(op);
            cnt -= 2;
          } else if (ClipperLib2.Clipper.SlopesNearCollinear(op.Prev.Pt, op.Pt, op.Next.Pt, distSqrd)) {
            op = ClipperLib2.Clipper.ExcludeOp(op);
            cnt--;
          } else {
            op.Idx = 1;
            op = op.Next;
          }
        }
        if (cnt < 3)
          cnt = 0;
        var result = new Array(cnt);
        for (var i = 0; i < cnt; ++i) {
          result[i] = new ClipperLib2.IntPoint1(op.Pt);
          op = op.Next;
        }
        outPts = null;
        return result;
      };
      ClipperLib2.Clipper.CleanPolygons = function(polys, distance) {
        var result = new Array(polys.length);
        for (var i = 0, ilen = polys.length; i < ilen; i++)
          result[i] = ClipperLib2.Clipper.CleanPolygon(polys[i], distance);
        return result;
      };
      ClipperLib2.Clipper.Minkowski = function(pattern, path2, IsSum, IsClosed) {
        var delta = IsClosed ? 1 : 0;
        var polyCnt = pattern.length;
        var pathCnt = path2.length;
        var result = new Array();
        if (IsSum)
          for (var i = 0; i < pathCnt; i++) {
            var p = new Array(polyCnt);
            for (var j = 0, jlen = pattern.length, ip = pattern[j]; j < jlen; j++, ip = pattern[j])
              p[j] = new ClipperLib2.IntPoint2(path2[i].X + ip.X, path2[i].Y + ip.Y);
            result.push(p);
          }
        else
          for (var i = 0; i < pathCnt; i++) {
            var p = new Array(polyCnt);
            for (var j = 0, jlen = pattern.length, ip = pattern[j]; j < jlen; j++, ip = pattern[j])
              p[j] = new ClipperLib2.IntPoint2(path2[i].X - ip.X, path2[i].Y - ip.Y);
            result.push(p);
          }
        var quads = new Array();
        for (var i = 0; i < pathCnt - 1 + delta; i++)
          for (var j = 0; j < polyCnt; j++) {
            var quad = new Array();
            quad.push(result[i % pathCnt][j % polyCnt]);
            quad.push(result[(i + 1) % pathCnt][j % polyCnt]);
            quad.push(result[(i + 1) % pathCnt][(j + 1) % polyCnt]);
            quad.push(result[i % pathCnt][(j + 1) % polyCnt]);
            if (!ClipperLib2.Clipper.Orientation(quad))
              quad.reverse();
            quads.push(quad);
          }
        return quads;
      };
      ClipperLib2.Clipper.MinkowskiSum = function(pattern, path_or_paths, pathIsClosed) {
        if (!(path_or_paths[0] instanceof Array)) {
          var path2 = path_or_paths;
          var paths = ClipperLib2.Clipper.Minkowski(pattern, path2, true, pathIsClosed);
          var c = new ClipperLib2.Clipper();
          c.AddPaths(paths, ClipperLib2.PolyType.ptSubject, true);
          c.Execute(ClipperLib2.ClipType.ctUnion, paths, ClipperLib2.PolyFillType.pftNonZero, ClipperLib2.PolyFillType.pftNonZero);
          return paths;
        } else {
          var paths = path_or_paths;
          var solution = new ClipperLib2.Paths();
          var c = new ClipperLib2.Clipper();
          for (var i = 0; i < paths.length; ++i) {
            var tmp = ClipperLib2.Clipper.Minkowski(pattern, paths[i], true, pathIsClosed);
            c.AddPaths(tmp, ClipperLib2.PolyType.ptSubject, true);
            if (pathIsClosed) {
              var path2 = ClipperLib2.Clipper.TranslatePath(paths[i], pattern[0]);
              c.AddPath(path2, ClipperLib2.PolyType.ptClip, true);
            }
          }
          c.Execute(
            ClipperLib2.ClipType.ctUnion,
            solution,
            ClipperLib2.PolyFillType.pftNonZero,
            ClipperLib2.PolyFillType.pftNonZero
          );
          return solution;
        }
      };
      ClipperLib2.Clipper.TranslatePath = function(path2, delta) {
        var outPath = new ClipperLib2.Path();
        for (var i = 0; i < path2.length; i++)
          outPath.push(new ClipperLib2.IntPoint2(path2[i].X + delta.X, path2[i].Y + delta.Y));
        return outPath;
      };
      ClipperLib2.Clipper.MinkowskiDiff = function(poly1, poly2) {
        var paths = ClipperLib2.Clipper.Minkowski(poly1, poly2, false, true);
        var c = new ClipperLib2.Clipper();
        c.AddPaths(paths, ClipperLib2.PolyType.ptSubject, true);
        c.Execute(ClipperLib2.ClipType.ctUnion, paths, ClipperLib2.PolyFillType.pftNonZero, ClipperLib2.PolyFillType.pftNonZero);
        return paths;
      };
      ClipperLib2.Clipper.PolyTreeToPaths = function(polytree) {
        var result = new Array();
        ClipperLib2.Clipper.AddPolyNodeToPaths(polytree, ClipperLib2.Clipper.NodeType.ntAny, result);
        return result;
      };
      ClipperLib2.Clipper.AddPolyNodeToPaths = function(polynode, nt, paths) {
        var match = true;
        switch (nt) {
          case ClipperLib2.Clipper.NodeType.ntOpen:
            return;
          case ClipperLib2.Clipper.NodeType.ntClosed:
            match = !polynode.IsOpen;
            break;
          default:
            break;
        }
        if (polynode.m_polygon.length > 0 && match)
          paths.push(polynode.m_polygon);
        for (var $i3 = 0, $t3 = polynode.Childs(), $l3 = $t3.length, pn = $t3[$i3]; $i3 < $l3; $i3++, pn = $t3[$i3])
          ClipperLib2.Clipper.AddPolyNodeToPaths(pn, nt, paths);
      };
      ClipperLib2.Clipper.OpenPathsFromPolyTree = function(polytree) {
        var result = new ClipperLib2.Paths();
        for (var i = 0, ilen = polytree.ChildCount(); i < ilen; i++)
          if (polytree.Childs()[i].IsOpen)
            result.push(polytree.Childs()[i].m_polygon);
        return result;
      };
      ClipperLib2.Clipper.ClosedPathsFromPolyTree = function(polytree) {
        var result = new ClipperLib2.Paths();
        ClipperLib2.Clipper.AddPolyNodeToPaths(polytree, ClipperLib2.Clipper.NodeType.ntClosed, result);
        return result;
      };
      Inherit(ClipperLib2.Clipper, ClipperLib2.ClipperBase);
      ClipperLib2.Clipper.NodeType = {
        ntAny: 0,
        ntOpen: 1,
        ntClosed: 2
      };
      ClipperLib2.ClipperOffset = function(miterLimit, arcTolerance) {
        if (typeof miterLimit === "undefined") miterLimit = 2;
        if (typeof arcTolerance === "undefined") arcTolerance = ClipperLib2.ClipperOffset.def_arc_tolerance;
        this.m_destPolys = new ClipperLib2.Paths();
        this.m_srcPoly = new ClipperLib2.Path();
        this.m_destPoly = new ClipperLib2.Path();
        this.m_normals = new Array();
        this.m_delta = 0;
        this.m_sinA = 0;
        this.m_sin = 0;
        this.m_cos = 0;
        this.m_miterLim = 0;
        this.m_StepsPerRad = 0;
        this.m_lowest = new ClipperLib2.IntPoint0();
        this.m_polyNodes = new ClipperLib2.PolyNode();
        this.MiterLimit = miterLimit;
        this.ArcTolerance = arcTolerance;
        this.m_lowest.X = -1;
      };
      ClipperLib2.ClipperOffset.two_pi = 6.28318530717959;
      ClipperLib2.ClipperOffset.def_arc_tolerance = 0.25;
      ClipperLib2.ClipperOffset.prototype.Clear = function() {
        ClipperLib2.Clear(this.m_polyNodes.Childs());
        this.m_lowest.X = -1;
      };
      ClipperLib2.ClipperOffset.Round = ClipperLib2.Clipper.Round;
      ClipperLib2.ClipperOffset.prototype.AddPath = function(path2, joinType, endType) {
        var highI = path2.length - 1;
        if (highI < 0)
          return;
        var newNode = new ClipperLib2.PolyNode();
        newNode.m_jointype = joinType;
        newNode.m_endtype = endType;
        if (endType === ClipperLib2.EndType.etClosedLine || endType === ClipperLib2.EndType.etClosedPolygon)
          while (highI > 0 && ClipperLib2.IntPoint.op_Equality(path2[0], path2[highI]))
            highI--;
        newNode.m_polygon.push(path2[0]);
        var j = 0, k = 0;
        for (var i = 1; i <= highI; i++)
          if (ClipperLib2.IntPoint.op_Inequality(newNode.m_polygon[j], path2[i])) {
            j++;
            newNode.m_polygon.push(path2[i]);
            if (path2[i].Y > newNode.m_polygon[k].Y || path2[i].Y === newNode.m_polygon[k].Y && path2[i].X < newNode.m_polygon[k].X)
              k = j;
          }
        if (endType === ClipperLib2.EndType.etClosedPolygon && j < 2) return;
        this.m_polyNodes.AddChild(newNode);
        if (endType !== ClipperLib2.EndType.etClosedPolygon)
          return;
        if (this.m_lowest.X < 0)
          this.m_lowest = new ClipperLib2.IntPoint2(this.m_polyNodes.ChildCount() - 1, k);
        else {
          var ip = this.m_polyNodes.Childs()[this.m_lowest.X].m_polygon[this.m_lowest.Y];
          if (newNode.m_polygon[k].Y > ip.Y || newNode.m_polygon[k].Y === ip.Y && newNode.m_polygon[k].X < ip.X)
            this.m_lowest = new ClipperLib2.IntPoint2(this.m_polyNodes.ChildCount() - 1, k);
        }
      };
      ClipperLib2.ClipperOffset.prototype.AddPaths = function(paths, joinType, endType) {
        for (var i = 0, ilen = paths.length; i < ilen; i++)
          this.AddPath(paths[i], joinType, endType);
      };
      ClipperLib2.ClipperOffset.prototype.FixOrientations = function() {
        if (this.m_lowest.X >= 0 && !ClipperLib2.Clipper.Orientation(this.m_polyNodes.Childs()[this.m_lowest.X].m_polygon)) {
          for (var i = 0; i < this.m_polyNodes.ChildCount(); i++) {
            var node = this.m_polyNodes.Childs()[i];
            if (node.m_endtype === ClipperLib2.EndType.etClosedPolygon || node.m_endtype === ClipperLib2.EndType.etClosedLine && ClipperLib2.Clipper.Orientation(node.m_polygon))
              node.m_polygon.reverse();
          }
        } else {
          for (var i = 0; i < this.m_polyNodes.ChildCount(); i++) {
            var node = this.m_polyNodes.Childs()[i];
            if (node.m_endtype === ClipperLib2.EndType.etClosedLine && !ClipperLib2.Clipper.Orientation(node.m_polygon))
              node.m_polygon.reverse();
          }
        }
      };
      ClipperLib2.ClipperOffset.GetUnitNormal = function(pt1, pt2) {
        var dx = pt2.X - pt1.X;
        var dy = pt2.Y - pt1.Y;
        if (dx === 0 && dy === 0)
          return new ClipperLib2.DoublePoint2(0, 0);
        var f2 = 1 / Math.sqrt(dx * dx + dy * dy);
        dx *= f2;
        dy *= f2;
        return new ClipperLib2.DoublePoint2(dy, -dx);
      };
      ClipperLib2.ClipperOffset.prototype.DoOffset = function(delta) {
        this.m_destPolys = new Array();
        this.m_delta = delta;
        if (ClipperLib2.ClipperBase.near_zero(delta)) {
          for (var i = 0; i < this.m_polyNodes.ChildCount(); i++) {
            var node = this.m_polyNodes.Childs()[i];
            if (node.m_endtype === ClipperLib2.EndType.etClosedPolygon)
              this.m_destPolys.push(node.m_polygon);
          }
          return;
        }
        if (this.MiterLimit > 2)
          this.m_miterLim = 2 / (this.MiterLimit * this.MiterLimit);
        else
          this.m_miterLim = 0.5;
        var y;
        if (this.ArcTolerance <= 0)
          y = ClipperLib2.ClipperOffset.def_arc_tolerance;
        else if (this.ArcTolerance > Math.abs(delta) * ClipperLib2.ClipperOffset.def_arc_tolerance)
          y = Math.abs(delta) * ClipperLib2.ClipperOffset.def_arc_tolerance;
        else
          y = this.ArcTolerance;
        var steps = 3.14159265358979 / Math.acos(1 - y / Math.abs(delta));
        this.m_sin = Math.sin(ClipperLib2.ClipperOffset.two_pi / steps);
        this.m_cos = Math.cos(ClipperLib2.ClipperOffset.two_pi / steps);
        this.m_StepsPerRad = steps / ClipperLib2.ClipperOffset.two_pi;
        if (delta < 0)
          this.m_sin = -this.m_sin;
        for (var i = 0; i < this.m_polyNodes.ChildCount(); i++) {
          var node = this.m_polyNodes.Childs()[i];
          this.m_srcPoly = node.m_polygon;
          var len = this.m_srcPoly.length;
          if (len === 0 || delta <= 0 && (len < 3 || node.m_endtype !== ClipperLib2.EndType.etClosedPolygon))
            continue;
          this.m_destPoly = new Array();
          if (len === 1) {
            if (node.m_jointype === ClipperLib2.JoinType.jtRound) {
              var X = 1, Y = 0;
              for (var j = 1; j <= steps; j++) {
                this.m_destPoly.push(new ClipperLib2.IntPoint2(ClipperLib2.ClipperOffset.Round(this.m_srcPoly[0].X + X * delta), ClipperLib2.ClipperOffset.Round(this.m_srcPoly[0].Y + Y * delta)));
                var X2 = X;
                X = X * this.m_cos - this.m_sin * Y;
                Y = X2 * this.m_sin + Y * this.m_cos;
              }
            } else {
              var X = -1, Y = -1;
              for (var j = 0; j < 4; ++j) {
                this.m_destPoly.push(new ClipperLib2.IntPoint2(ClipperLib2.ClipperOffset.Round(this.m_srcPoly[0].X + X * delta), ClipperLib2.ClipperOffset.Round(this.m_srcPoly[0].Y + Y * delta)));
                if (X < 0)
                  X = 1;
                else if (Y < 0)
                  Y = 1;
                else
                  X = -1;
              }
            }
            this.m_destPolys.push(this.m_destPoly);
            continue;
          }
          this.m_normals.length = 0;
          for (var j = 0; j < len - 1; j++)
            this.m_normals.push(ClipperLib2.ClipperOffset.GetUnitNormal(this.m_srcPoly[j], this.m_srcPoly[j + 1]));
          if (node.m_endtype === ClipperLib2.EndType.etClosedLine || node.m_endtype === ClipperLib2.EndType.etClosedPolygon)
            this.m_normals.push(ClipperLib2.ClipperOffset.GetUnitNormal(this.m_srcPoly[len - 1], this.m_srcPoly[0]));
          else
            this.m_normals.push(new ClipperLib2.DoublePoint1(this.m_normals[len - 2]));
          if (node.m_endtype === ClipperLib2.EndType.etClosedPolygon) {
            var k = len - 1;
            for (var j = 0; j < len; j++)
              k = this.OffsetPoint(j, k, node.m_jointype);
            this.m_destPolys.push(this.m_destPoly);
          } else if (node.m_endtype === ClipperLib2.EndType.etClosedLine) {
            var k = len - 1;
            for (var j = 0; j < len; j++)
              k = this.OffsetPoint(j, k, node.m_jointype);
            this.m_destPolys.push(this.m_destPoly);
            this.m_destPoly = new Array();
            var n = this.m_normals[len - 1];
            for (var j = len - 1; j > 0; j--)
              this.m_normals[j] = new ClipperLib2.DoublePoint2(-this.m_normals[j - 1].X, -this.m_normals[j - 1].Y);
            this.m_normals[0] = new ClipperLib2.DoublePoint2(-n.X, -n.Y);
            k = 0;
            for (var j = len - 1; j >= 0; j--)
              k = this.OffsetPoint(j, k, node.m_jointype);
            this.m_destPolys.push(this.m_destPoly);
          } else {
            var k = 0;
            for (var j = 1; j < len - 1; ++j)
              k = this.OffsetPoint(j, k, node.m_jointype);
            var pt1;
            if (node.m_endtype === ClipperLib2.EndType.etOpenButt) {
              var j = len - 1;
              pt1 = new ClipperLib2.IntPoint2(ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].X + this.m_normals[j].X * delta), ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].Y + this.m_normals[j].Y * delta));
              this.m_destPoly.push(pt1);
              pt1 = new ClipperLib2.IntPoint2(ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].X - this.m_normals[j].X * delta), ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].Y - this.m_normals[j].Y * delta));
              this.m_destPoly.push(pt1);
            } else {
              var j = len - 1;
              k = len - 2;
              this.m_sinA = 0;
              this.m_normals[j] = new ClipperLib2.DoublePoint2(-this.m_normals[j].X, -this.m_normals[j].Y);
              if (node.m_endtype === ClipperLib2.EndType.etOpenSquare)
                this.DoSquare(j, k);
              else
                this.DoRound(j, k);
            }
            for (var j = len - 1; j > 0; j--)
              this.m_normals[j] = new ClipperLib2.DoublePoint2(-this.m_normals[j - 1].X, -this.m_normals[j - 1].Y);
            this.m_normals[0] = new ClipperLib2.DoublePoint2(-this.m_normals[1].X, -this.m_normals[1].Y);
            k = len - 1;
            for (var j = k - 1; j > 0; --j)
              k = this.OffsetPoint(j, k, node.m_jointype);
            if (node.m_endtype === ClipperLib2.EndType.etOpenButt) {
              pt1 = new ClipperLib2.IntPoint2(ClipperLib2.ClipperOffset.Round(this.m_srcPoly[0].X - this.m_normals[0].X * delta), ClipperLib2.ClipperOffset.Round(this.m_srcPoly[0].Y - this.m_normals[0].Y * delta));
              this.m_destPoly.push(pt1);
              pt1 = new ClipperLib2.IntPoint2(ClipperLib2.ClipperOffset.Round(this.m_srcPoly[0].X + this.m_normals[0].X * delta), ClipperLib2.ClipperOffset.Round(this.m_srcPoly[0].Y + this.m_normals[0].Y * delta));
              this.m_destPoly.push(pt1);
            } else {
              k = 1;
              this.m_sinA = 0;
              if (node.m_endtype === ClipperLib2.EndType.etOpenSquare)
                this.DoSquare(0, 1);
              else
                this.DoRound(0, 1);
            }
            this.m_destPolys.push(this.m_destPoly);
          }
        }
      };
      ClipperLib2.ClipperOffset.prototype.Execute = function() {
        var a = arguments, ispolytree = a[0] instanceof ClipperLib2.PolyTree;
        if (!ispolytree) {
          var solution = a[0], delta = a[1];
          ClipperLib2.Clear(solution);
          this.FixOrientations();
          this.DoOffset(delta);
          var clpr = new ClipperLib2.Clipper(0);
          clpr.AddPaths(this.m_destPolys, ClipperLib2.PolyType.ptSubject, true);
          if (delta > 0) {
            clpr.Execute(ClipperLib2.ClipType.ctUnion, solution, ClipperLib2.PolyFillType.pftPositive, ClipperLib2.PolyFillType.pftPositive);
          } else {
            var r = ClipperLib2.Clipper.GetBounds(this.m_destPolys);
            var outer = new ClipperLib2.Path();
            outer.push(new ClipperLib2.IntPoint2(r.left - 10, r.bottom + 10));
            outer.push(new ClipperLib2.IntPoint2(r.right + 10, r.bottom + 10));
            outer.push(new ClipperLib2.IntPoint2(r.right + 10, r.top - 10));
            outer.push(new ClipperLib2.IntPoint2(r.left - 10, r.top - 10));
            clpr.AddPath(outer, ClipperLib2.PolyType.ptSubject, true);
            clpr.ReverseSolution = true;
            clpr.Execute(ClipperLib2.ClipType.ctUnion, solution, ClipperLib2.PolyFillType.pftNegative, ClipperLib2.PolyFillType.pftNegative);
            if (solution.length > 0)
              solution.splice(0, 1);
          }
        } else {
          var solution = a[0], delta = a[1];
          solution.Clear();
          this.FixOrientations();
          this.DoOffset(delta);
          var clpr = new ClipperLib2.Clipper(0);
          clpr.AddPaths(this.m_destPolys, ClipperLib2.PolyType.ptSubject, true);
          if (delta > 0) {
            clpr.Execute(ClipperLib2.ClipType.ctUnion, solution, ClipperLib2.PolyFillType.pftPositive, ClipperLib2.PolyFillType.pftPositive);
          } else {
            var r = ClipperLib2.Clipper.GetBounds(this.m_destPolys);
            var outer = new ClipperLib2.Path();
            outer.push(new ClipperLib2.IntPoint2(r.left - 10, r.bottom + 10));
            outer.push(new ClipperLib2.IntPoint2(r.right + 10, r.bottom + 10));
            outer.push(new ClipperLib2.IntPoint2(r.right + 10, r.top - 10));
            outer.push(new ClipperLib2.IntPoint2(r.left - 10, r.top - 10));
            clpr.AddPath(outer, ClipperLib2.PolyType.ptSubject, true);
            clpr.ReverseSolution = true;
            clpr.Execute(ClipperLib2.ClipType.ctUnion, solution, ClipperLib2.PolyFillType.pftNegative, ClipperLib2.PolyFillType.pftNegative);
            if (solution.ChildCount() === 1 && solution.Childs()[0].ChildCount() > 0) {
              var outerNode = solution.Childs()[0];
              solution.Childs()[0] = outerNode.Childs()[0];
              solution.Childs()[0].m_Parent = solution;
              for (var i = 1; i < outerNode.ChildCount(); i++)
                solution.AddChild(outerNode.Childs()[i]);
            } else
              solution.Clear();
          }
        }
      };
      ClipperLib2.ClipperOffset.prototype.OffsetPoint = function(j, k, jointype) {
        this.m_sinA = this.m_normals[k].X * this.m_normals[j].Y - this.m_normals[j].X * this.m_normals[k].Y;
        if (Math.abs(this.m_sinA * this.m_delta) < 1) {
          var cosA = this.m_normals[k].X * this.m_normals[j].X + this.m_normals[j].Y * this.m_normals[k].Y;
          if (cosA > 0) {
            this.m_destPoly.push(new ClipperLib2.IntPoint2(
              ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].X + this.m_normals[k].X * this.m_delta),
              ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].Y + this.m_normals[k].Y * this.m_delta)
            ));
            return k;
          }
        } else if (this.m_sinA > 1)
          this.m_sinA = 1;
        else if (this.m_sinA < -1)
          this.m_sinA = -1;
        if (this.m_sinA * this.m_delta < 0) {
          this.m_destPoly.push(new ClipperLib2.IntPoint2(
            ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].X + this.m_normals[k].X * this.m_delta),
            ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].Y + this.m_normals[k].Y * this.m_delta)
          ));
          this.m_destPoly.push(new ClipperLib2.IntPoint1(this.m_srcPoly[j]));
          this.m_destPoly.push(new ClipperLib2.IntPoint2(
            ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].X + this.m_normals[j].X * this.m_delta),
            ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].Y + this.m_normals[j].Y * this.m_delta)
          ));
        } else
          switch (jointype) {
            case ClipperLib2.JoinType.jtMiter: {
              var r = 1 + (this.m_normals[j].X * this.m_normals[k].X + this.m_normals[j].Y * this.m_normals[k].Y);
              if (r >= this.m_miterLim)
                this.DoMiter(j, k, r);
              else
                this.DoSquare(j, k);
              break;
            }
            case ClipperLib2.JoinType.jtSquare:
              this.DoSquare(j, k);
              break;
            case ClipperLib2.JoinType.jtRound:
              this.DoRound(j, k);
              break;
          }
        k = j;
        return k;
      };
      ClipperLib2.ClipperOffset.prototype.DoSquare = function(j, k) {
        var dx = Math.tan(Math.atan2(
          this.m_sinA,
          this.m_normals[k].X * this.m_normals[j].X + this.m_normals[k].Y * this.m_normals[j].Y
        ) / 4);
        this.m_destPoly.push(new ClipperLib2.IntPoint2(
          ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].X + this.m_delta * (this.m_normals[k].X - this.m_normals[k].Y * dx)),
          ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].Y + this.m_delta * (this.m_normals[k].Y + this.m_normals[k].X * dx))
        ));
        this.m_destPoly.push(new ClipperLib2.IntPoint2(
          ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].X + this.m_delta * (this.m_normals[j].X + this.m_normals[j].Y * dx)),
          ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].Y + this.m_delta * (this.m_normals[j].Y - this.m_normals[j].X * dx))
        ));
      };
      ClipperLib2.ClipperOffset.prototype.DoMiter = function(j, k, r) {
        var q = this.m_delta / r;
        this.m_destPoly.push(new ClipperLib2.IntPoint2(
          ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].X + (this.m_normals[k].X + this.m_normals[j].X) * q),
          ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].Y + (this.m_normals[k].Y + this.m_normals[j].Y) * q)
        ));
      };
      ClipperLib2.ClipperOffset.prototype.DoRound = function(j, k) {
        var a = Math.atan2(
          this.m_sinA,
          this.m_normals[k].X * this.m_normals[j].X + this.m_normals[k].Y * this.m_normals[j].Y
        );
        var steps = Math.max(ClipperLib2.Cast_Int32(ClipperLib2.ClipperOffset.Round(this.m_StepsPerRad * Math.abs(a))), 1);
        var X = this.m_normals[k].X, Y = this.m_normals[k].Y, X2;
        for (var i = 0; i < steps; ++i) {
          this.m_destPoly.push(new ClipperLib2.IntPoint2(
            ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].X + X * this.m_delta),
            ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].Y + Y * this.m_delta)
          ));
          X2 = X;
          X = X * this.m_cos - this.m_sin * Y;
          Y = X2 * this.m_sin + Y * this.m_cos;
        }
        this.m_destPoly.push(new ClipperLib2.IntPoint2(
          ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].X + this.m_normals[j].X * this.m_delta),
          ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].Y + this.m_normals[j].Y * this.m_delta)
        ));
      };
      ClipperLib2.Error = function(message) {
        try {
          throw new Error(message);
        } catch (err) {
          alert(err.message);
        }
      };
      ClipperLib2.JS = {};
      ClipperLib2.JS.AreaOfPolygon = function(poly, scale) {
        if (!scale) scale = 1;
        return ClipperLib2.Clipper.Area(poly) / (scale * scale);
      };
      ClipperLib2.JS.AreaOfPolygons = function(poly, scale) {
        if (!scale) scale = 1;
        var area = 0;
        for (var i = 0; i < poly.length; i++) {
          area += ClipperLib2.Clipper.Area(poly[i]);
        }
        return area / (scale * scale);
      };
      ClipperLib2.JS.BoundsOfPath = function(path2, scale) {
        return ClipperLib2.JS.BoundsOfPaths([path2], scale);
      };
      ClipperLib2.JS.BoundsOfPaths = function(paths, scale) {
        if (!scale) scale = 1;
        var bounds = ClipperLib2.Clipper.GetBounds(paths);
        bounds.left /= scale;
        bounds.bottom /= scale;
        bounds.right /= scale;
        bounds.top /= scale;
        return bounds;
      };
      ClipperLib2.JS.Clean = function(polygon, delta) {
        if (!(polygon instanceof Array)) return [];
        var isPolygons = polygon[0] instanceof Array;
        var polygon = ClipperLib2.JS.Clone(polygon);
        if (typeof delta !== "number" || delta === null) {
          ClipperLib2.Error("Delta is not a number in Clean().");
          return polygon;
        }
        if (polygon.length === 0 || polygon.length === 1 && polygon[0].length === 0 || delta < 0) return polygon;
        if (!isPolygons) polygon = [polygon];
        var k_length = polygon.length;
        var len, poly, result, d, p, j, i;
        var results = [];
        for (var k = 0; k < k_length; k++) {
          poly = polygon[k];
          len = poly.length;
          if (len === 0) continue;
          else if (len < 3) {
            result = poly;
            results.push(result);
            continue;
          }
          result = poly;
          d = delta * delta;
          p = poly[0];
          j = 1;
          for (i = 1; i < len; i++) {
            if ((poly[i].X - p.X) * (poly[i].X - p.X) + (poly[i].Y - p.Y) * (poly[i].Y - p.Y) <= d)
              continue;
            result[j] = poly[i];
            p = poly[i];
            j++;
          }
          p = poly[j - 1];
          if ((poly[0].X - p.X) * (poly[0].X - p.X) + (poly[0].Y - p.Y) * (poly[0].Y - p.Y) <= d)
            j--;
          if (j < len)
            result.splice(j, len - j);
          if (result.length) results.push(result);
        }
        if (!isPolygons && results.length) results = results[0];
        else if (!isPolygons && results.length === 0) results = [];
        else if (isPolygons && results.length === 0) results = [
          []
        ];
        return results;
      };
      ClipperLib2.JS.Clone = function(polygon) {
        if (!(polygon instanceof Array)) return [];
        if (polygon.length === 0) return [];
        else if (polygon.length === 1 && polygon[0].length === 0) return [
          []
        ];
        var isPolygons = polygon[0] instanceof Array;
        if (!isPolygons) polygon = [polygon];
        var len = polygon.length, plen, i, j, result;
        var results = new Array(len);
        for (i = 0; i < len; i++) {
          plen = polygon[i].length;
          result = new Array(plen);
          for (j = 0; j < plen; j++) {
            result[j] = {
              X: polygon[i][j].X,
              Y: polygon[i][j].Y
            };
          }
          results[i] = result;
        }
        if (!isPolygons) results = results[0];
        return results;
      };
      ClipperLib2.JS.Lighten = function(polygon, tolerance) {
        if (!(polygon instanceof Array)) return [];
        if (typeof tolerance !== "number" || tolerance === null) {
          ClipperLib2.Error("Tolerance is not a number in Lighten().");
          return ClipperLib2.JS.Clone(polygon);
        }
        if (polygon.length === 0 || polygon.length === 1 && polygon[0].length === 0 || tolerance < 0) {
          return ClipperLib2.JS.Clone(polygon);
        }
        var isPolygons = polygon[0] instanceof Array;
        if (!isPolygons) polygon = [polygon];
        var i, j, poly, k, poly2, plen, A, B, P, d, rem, addlast;
        var bxax, byay, l, ax, ay;
        var len = polygon.length;
        var toleranceSq = tolerance * tolerance;
        var results = [];
        for (i = 0; i < len; i++) {
          poly = polygon[i];
          plen = poly.length;
          if (plen === 0) continue;
          for (k = 0; k < 1e6; k++) {
            poly2 = [];
            plen = poly.length;
            if (poly[plen - 1].X !== poly[0].X || poly[plen - 1].Y !== poly[0].Y) {
              addlast = 1;
              poly.push(
                {
                  X: poly[0].X,
                  Y: poly[0].Y
                }
              );
              plen = poly.length;
            } else addlast = 0;
            rem = [];
            for (j = 0; j < plen - 2; j++) {
              A = poly[j];
              P = poly[j + 1];
              B = poly[j + 2];
              ax = A.X;
              ay = A.Y;
              bxax = B.X - ax;
              byay = B.Y - ay;
              if (bxax !== 0 || byay !== 0) {
                l = ((P.X - ax) * bxax + (P.Y - ay) * byay) / (bxax * bxax + byay * byay);
                if (l > 1) {
                  ax = B.X;
                  ay = B.Y;
                } else if (l > 0) {
                  ax += bxax * l;
                  ay += byay * l;
                }
              }
              bxax = P.X - ax;
              byay = P.Y - ay;
              d = bxax * bxax + byay * byay;
              if (d <= toleranceSq) {
                rem[j + 1] = 1;
                j++;
              }
            }
            poly2.push(
              {
                X: poly[0].X,
                Y: poly[0].Y
              }
            );
            for (j = 1; j < plen - 1; j++)
              if (!rem[j]) poly2.push(
                {
                  X: poly[j].X,
                  Y: poly[j].Y
                }
              );
            poly2.push(
              {
                X: poly[plen - 1].X,
                Y: poly[plen - 1].Y
              }
            );
            if (addlast) poly.pop();
            if (!rem.length) break;
            else poly = poly2;
          }
          plen = poly2.length;
          if (poly2[plen - 1].X === poly2[0].X && poly2[plen - 1].Y === poly2[0].Y) {
            poly2.pop();
          }
          if (poly2.length > 2)
            results.push(poly2);
        }
        if (!isPolygons) {
          results = results[0];
        }
        if (typeof results === "undefined") {
          results = [];
        }
        return results;
      };
      ClipperLib2.JS.PerimeterOfPath = function(path2, closed, scale) {
        if (typeof path2 === "undefined") return 0;
        var sqrt = Math.sqrt;
        var perimeter = 0;
        var p1, p2, p1x = 0, p1y = 0, p2x = 0, p2y = 0;
        var j = path2.length;
        if (j < 2) return 0;
        if (closed) {
          path2[j] = path2[0];
          j++;
        }
        while (--j) {
          p1 = path2[j];
          p1x = p1.X;
          p1y = p1.Y;
          p2 = path2[j - 1];
          p2x = p2.X;
          p2y = p2.Y;
          perimeter += sqrt((p1x - p2x) * (p1x - p2x) + (p1y - p2y) * (p1y - p2y));
        }
        if (closed) path2.pop();
        return perimeter / scale;
      };
      ClipperLib2.JS.PerimeterOfPaths = function(paths, closed, scale) {
        if (!scale) scale = 1;
        var perimeter = 0;
        for (var i = 0; i < paths.length; i++) {
          perimeter += ClipperLib2.JS.PerimeterOfPath(paths[i], closed, scale);
        }
        return perimeter;
      };
      ClipperLib2.JS.ScaleDownPath = function(path2, scale) {
        var i, p;
        if (!scale) scale = 1;
        i = path2.length;
        while (i--) {
          p = path2[i];
          p.X = p.X / scale;
          p.Y = p.Y / scale;
        }
      };
      ClipperLib2.JS.ScaleDownPaths = function(paths, scale) {
        var i, j, p;
        if (!scale) scale = 1;
        i = paths.length;
        while (i--) {
          j = paths[i].length;
          while (j--) {
            p = paths[i][j];
            p.X = p.X / scale;
            p.Y = p.Y / scale;
          }
        }
      };
      ClipperLib2.JS.ScaleUpPath = function(path2, scale) {
        var i, p, round2 = Math.round;
        if (!scale) scale = 1;
        i = path2.length;
        while (i--) {
          p = path2[i];
          p.X = round2(p.X * scale);
          p.Y = round2(p.Y * scale);
        }
      };
      ClipperLib2.JS.ScaleUpPaths = function(paths, scale) {
        var i, j, p, round2 = Math.round;
        if (!scale) scale = 1;
        i = paths.length;
        while (i--) {
          j = paths[i].length;
          while (j--) {
            p = paths[i][j];
            p.X = round2(p.X * scale);
            p.Y = round2(p.Y * scale);
          }
        }
      };
      ClipperLib2.ExPolygons = function() {
        return [];
      };
      ClipperLib2.ExPolygon = function() {
        this.outer = null;
        this.holes = null;
      };
      ClipperLib2.JS.AddOuterPolyNodeToExPolygons = function(polynode, expolygons) {
        var ep = new ClipperLib2.ExPolygon();
        ep.outer = polynode.Contour();
        var childs = polynode.Childs();
        var ilen = childs.length;
        ep.holes = new Array(ilen);
        var node, n, i, j, childs2, jlen;
        for (i = 0; i < ilen; i++) {
          node = childs[i];
          ep.holes[i] = node.Contour();
          for (j = 0, childs2 = node.Childs(), jlen = childs2.length; j < jlen; j++) {
            n = childs2[j];
            ClipperLib2.JS.AddOuterPolyNodeToExPolygons(n, expolygons);
          }
        }
        expolygons.push(ep);
      };
      ClipperLib2.JS.ExPolygonsToPaths = function(expolygons) {
        var a, i, alen, ilen;
        var paths = new ClipperLib2.Paths();
        for (a = 0, alen = expolygons.length; a < alen; a++) {
          paths.push(expolygons[a].outer);
          for (i = 0, ilen = expolygons[a].holes.length; i < ilen; i++) {
            paths.push(expolygons[a].holes[i]);
          }
        }
        return paths;
      };
      ClipperLib2.JS.PolyTreeToExPolygons = function(polytree) {
        var expolygons = new ClipperLib2.ExPolygons();
        var node, i, childs, ilen;
        for (i = 0, childs = polytree.Childs(), ilen = childs.length; i < ilen; i++) {
          node = childs[i];
          ClipperLib2.JS.AddOuterPolyNodeToExPolygons(node, expolygons);
        }
        return expolygons;
      };
    })();
  }
});

// src/lib/__laser-check.ts
import { writeFileSync } from "node:fs";

// src/lib/production-svg.ts
var import_opentype2 = __toESM(require_opentype(), 1);

// src/lib/production-fonts.ts
var import_opentype = __toESM(require_opentype(), 1);
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decompress } from "wawoff2";

// src/lib/logger.ts
import pino from "pino";
var isProduction = process.env.NODE_ENV === "production";
var logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']"
  ],
  ...isProduction ? {} : {
    transport: {
      target: "pino-pretty",
      options: { colorize: true }
    }
  }
});

// src/lib/production-fonts.ts
var FONT_TABLE = {
  f1: { name: "Abril Fatface", file: "abril-latin.woff2", letterSpacing: 0.05 },
  f2: { name: "Anthony Hunter", file: "AnthonyHunter.woff2" },
  f3: { name: "Billion Dreams", file: "BillionDreams.woff2" },
  f4: { name: "Blendaria", file: "Blendaria.woff2" },
  f5: { name: "Bree Serif", file: "BreeSerif.woff2" },
  f6: { name: "Cronos Pro", file: "Cronos-Pro-Subhead.woff2" },
  f7: { name: "Ellisha", file: "Ellisha.woff2" },
  f8: { name: "Freestyle Script", file: "FreestyleScript.woff2" },
  f9: { name: "Heavitas", file: "Heavitas.woff2" },
  f10: { name: "Impacted", file: "Impacted.woff2" },
  f11: { name: "KG Dark Side", file: "KGDarkSide.woff2" },
  f12: { name: "Kissing Season", file: "KissingSeason.woff2" },
  f13: { name: "Libre Baskerville", file: "LibreBaskerville.woff2" },
  f14: { name: "Milkshake", file: "Milkshake.woff2" },
  f15: { name: "Pacifico", file: "Pacifico.woff2" },
  f16: { name: "Party Confetti", file: "PartyConfetti.woff2" },
  f17: { name: "Quimil", file: "Quimil.woff2" },
  f18: { name: "Renogare", file: "Renogare.woff2" },
  f19: { name: "Rimouski Sb", file: "RimouskiSb.woff2" },
  f20: { name: "Square 721", file: "Square721.woff2" },
  f21: { name: "TT Rounds Neue", file: "TTRoundsNeue.woff2" },
  // "Versalita" en el front es Arial bold uppercase (fuente de sistema, sin
  // archivo). Aproximamos con Inter + mayúsculas. AJUSTAR si el taller quiere
  // otra fuente de producción para este estilo.
  f22: { name: "Versalita", file: "inter-latin.woff2", letterSpacing: 0.15, uppercase: true },
  f23: { name: "Bulgatti", file: "Bulgatti.woff2" }
};
var FALLBACK_ID = "f22";
var here = path.dirname(fileURLToPath(import.meta.url));
var FONT_DIR_CANDIDATES = [
  // dist/fonts — build.mjs copia los .woff2 acá.
  path.join(here, "fonts"),
  // Repo en desarrollo: artifacts/api-server/{dist,src/lib} → artifacts/termos-landing.
  path.resolve(here, "../../termos-landing/public/fonts"),
  path.resolve(here, "../../../termos-landing/public/fonts")
];
function fontsDir() {
  for (const dir of FONT_DIR_CANDIDATES) {
    if (existsSync(dir)) return dir;
  }
  return null;
}
var INFO_ID = "__info";
var INFO_ENTRY = { name: "Inter", file: "inter-latin.woff2" };
var cache = /* @__PURE__ */ new Map();
function loadProductionFont(fontId) {
  const id = fontId && (FONT_TABLE[fontId] || fontId === INFO_ID) ? fontId : FALLBACK_ID;
  let p = cache.get(id);
  if (!p) {
    p = (async () => {
      const entry = id === INFO_ID ? INFO_ENTRY : FONT_TABLE[id];
      const dir = fontsDir();
      if (!dir) {
        logger.error({ candidates: FONT_DIR_CANDIDATES }, "production font: fonts dir not found");
        return null;
      }
      const file = path.join(dir, entry.file);
      try {
        const woff2 = readFileSync(file);
        const ttf = await decompress(woff2);
        const ab = ttf.buffer.slice(ttf.byteOffset, ttf.byteOffset + ttf.byteLength);
        const font = import_opentype.default.parse(ab);
        const spacing = "letterSpacing" in entry ? entry.letterSpacing ?? 0 : 0;
        const upper = "uppercase" in entry ? entry.uppercase ?? false : false;
        return {
          font,
          name: entry.name,
          letterSpacing: spacing,
          uppercase: upper
        };
      } catch (err) {
        logger.error({ file, err }, "production font: load failed");
        return null;
      }
    })();
    cache.set(id, p);
  }
  return p;
}
function loadInfoFont() {
  return loadProductionFont(INFO_ID);
}

// src/lib/production-icons.ts
var PRODUCTION_ICONS = [
  { id: "heart", name: "Coraz\xF3n", body: `<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/>` },
  { id: "star", name: "Estrella", body: `<path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="currentColor"/>` },
  { id: "flower", name: "Flor", body: `<g fill="currentColor"><circle cx="12" cy="6" r="3"/><circle cx="17.7" cy="10.1" r="3"/><circle cx="15.5" cy="16.9" r="3"/><circle cx="8.5" cy="16.9" r="3"/><circle cx="6.3" cy="10.1" r="3"/><circle cx="12" cy="12" r="2.6"/></g>` },
  { id: "paw", name: "Huella", body: `<g fill="currentColor"><circle cx="6" cy="9.5" r="2.1"/><circle cx="10" cy="6.5" r="2.1"/><circle cx="14" cy="6.5" r="2.1"/><circle cx="18" cy="9.5" r="2.1"/><ellipse cx="12" cy="15.5" rx="4.6" ry="3.9"/></g>` },
  { id: "crown", name: "Corona", body: `<path d="M3 8l3.5 3.5L12 4l5.5 7.5L21 8l-1.7 11H4.7z" fill="currentColor"/>` },
  { id: "music", name: "M\xFAsica", body: `<g fill="currentColor"><circle cx="8" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><rect x="10.4" y="4" width="2.2" height="14"/><rect x="19.3" y="4" width="2.2" height="12"/><path d="M10.4 4L21.5 6V9L10.4 7z"/></g>` },
  { id: "ball", name: "Pelota", body: `<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><polygon points="12,8 15.3,10.4 14,14.3 10,14.3 8.7,10.4" fill="currentColor"/>` },
  { id: "mate", name: "Mate", body: `<g fill="currentColor"><path d="M5.5 8h9v6.2A3.8 3.8 0 0 1 10.7 18H9.3A3.8 3.8 0 0 1 5.5 14.2z"/><rect x="6" y="4" width="8" height="2" rx="1"/></g><path d="M14.5 9.5h2.2a2.4 2.4 0 0 1 0 4.8h-1.7" fill="none" stroke="currentColor" stroke-width="2"/>` },
  { id: "anchor", name: "Ancla", body: `<g fill="currentColor"><rect x="11" y="7" width="2" height="12"/><rect x="8.5" y="9" width="7" height="2"/></g><circle cx="12" cy="5" r="2.3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 13a8 8 0 0 0 16 0" fill="none" stroke="currentColor" stroke-width="2"/>` },
  { id: "mountain", name: "Monta\xF1a", body: `<path d="M2 20L9 7l3.5 6.2L15 9l7 11z" fill="currentColor"/>` },
  { id: "bolt", name: "Rayo", body: `<path d="M13 2L4 14h6l-1 8 9-12h-6z" fill="currentColor"/>` },
  { id: "diamond", name: "Diamante", body: `<path d="M6 3h12l3 5-9 13L3 8z" fill="currentColor"/>` }
];
function productionIconById(id) {
  if (!id) return null;
  return PRODUCTION_ICONS.find((i) => i.id === id) ?? null;
}

// src/lib/outline-union.ts
var import_clipper_lib = __toESM(require_clipper(), 1);
var SCALE = 1e3;
function unionOutlines(polys) {
  const input = polys.filter((p) => p.length >= 3);
  if (input.length === 0) return [];
  try {
    const paths = input.map((p) => p.map(([x, y]) => ({ X: Math.round(x * SCALE), Y: Math.round(y * SCALE) })));
    const clipper = new import_clipper_lib.default.Clipper();
    clipper.AddPaths(paths, import_clipper_lib.default.PolyType.ptSubject, true);
    const solution = [];
    const ok = clipper.Execute(
      import_clipper_lib.default.ClipType.ctUnion,
      solution,
      import_clipper_lib.default.PolyFillType.pftNonZero,
      import_clipper_lib.default.PolyFillType.pftNonZero
    );
    if (!ok || solution.length === 0) return input;
    const clean = import_clipper_lib.default.Clipper.CleanPolygons(solution, 2);
    const out2 = clean.filter((p) => p.length >= 3).map((p) => p.map((q) => [q.X / SCALE, q.Y / SCALE]));
    return out2.length ? out2 : input;
  } catch {
    return input;
  }
}
function outlinesCross(polys) {
  const segs = [];
  polys.forEach((p, poly) => p.forEach((a, i) => segs.push({ a, b: p[(i + 1) % p.length], poly, i, n: p.length })));
  const cross = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const EPS = 1e-9;
  const items = segs.map((s) => ({ ...s, x0: Math.min(s.a[0], s.b[0]), x1: Math.max(s.a[0], s.b[0]) })).sort((s, t) => s.x0 - t.x0);
  for (let i = 0; i < items.length; i++) {
    const s = items[i];
    for (let j = i + 1; j < items.length && items[j].x0 <= s.x1; j++) {
      const t = items[j];
      if (s.poly === t.poly && (Math.abs(s.i - t.i) <= 1 || Math.abs(s.i - t.i) === s.n - 1)) continue;
      const d1 = cross(s.a, s.b, t.a), d2 = cross(s.a, s.b, t.b), d3 = cross(t.a, t.b, s.a), d4 = cross(t.a, t.b, s.b);
      if ((d1 > EPS && d2 < -EPS || d1 < -EPS && d2 > EPS) && (d3 > EPS && d4 < -EPS || d3 < -EPS && d4 > EPS)) return true;
    }
  }
  return false;
}

// src/lib/production-dxf.ts
var IDENT = [1, 0, 0, 1, 0, 0];
var mul = (m, n) => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5]
];
var apply = (m, [x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
var scaleOf = (m) => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1;
function parseTransform(t) {
  let m = IDENT;
  if (!t) return m;
  for (const [, fn, args] of t.matchAll(/(\w+)\s*\(([^)]*)\)/g)) {
    const a = (args ?? "").split(/[\s,]+/).filter(Boolean).map(Number);
    if (fn === "translate") m = mul(m, [1, 0, 0, 1, a[0] ?? 0, a[1] ?? 0]);
    else if (fn === "scale") m = mul(m, [a[0] ?? 1, 0, 0, a[1] ?? a[0] ?? 1, 0, 0]);
    else if (fn === "rotate") {
      const r = (a[0] ?? 0) * Math.PI / 180;
      const cx = a[1] ?? 0, cy = a[2] ?? 0;
      m = mul(m, [1, 0, 0, 1, cx, cy]);
      m = mul(m, [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0]);
      m = mul(m, [1, 0, 0, 1, -cx, -cy]);
    } else if (fn === "matrix" && a.length === 6) m = mul(m, a);
  }
  return m;
}
var segsFor = (len, tol) => Math.max(2, Math.min(200, Math.ceil(len / tol)));
function arcPoints(p0, rx, ry, rotDeg, large, sweep, p1, tol) {
  if (rx === 0 || ry === 0 || p0[0] === p1[0] && p0[1] === p1[1]) return [p1];
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const phi = rotDeg * Math.PI / 180, cos = Math.cos(phi), sin = Math.sin(phi);
  const dx = (p0[0] - p1[0]) / 2, dy = (p0[1] - p1[1]) / 2;
  const x1 = cos * dx + sin * dy, y1 = -sin * dx + cos * dy;
  const lam = x1 * x1 / (rx * rx) + y1 * y1 / (ry * ry);
  if (lam > 1) {
    rx *= Math.sqrt(lam);
    ry *= Math.sqrt(lam);
  }
  const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
  const den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  let k = Math.sqrt(Math.max(0, num / den));
  if (large === sweep) k = -k;
  const cxp = k * rx * y1 / ry, cyp = -k * ry * x1 / rx;
  const cx = cos * cxp - sin * cyp + (p0[0] + p1[0]) / 2;
  const cy = sin * cxp + cos * cyp + (p0[1] + p1[1]) / 2;
  const ang = (ux, uy, vx, vy) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  const t1 = ang(1, 0, (x1 - cxp) / rx, (y1 - cyp) / ry);
  let dt = ang((x1 - cxp) / rx, (y1 - cyp) / ry, (-x1 - cxp) / rx, (-y1 - cyp) / ry);
  if (!sweep && dt > 0) dt -= 2 * Math.PI;
  else if (sweep && dt < 0) dt += 2 * Math.PI;
  const n = segsFor(Math.abs(dt) * Math.max(rx, ry), tol);
  const out2 = [];
  for (let i = 1; i <= n; i++) {
    const t = t1 + dt * i / n;
    const ex = rx * Math.cos(t), ey = ry * Math.sin(t);
    out2.push([cos * ex - sin * ey + cx, sin * ex + cos * ey + cy]);
  }
  return out2;
}
function pathToPolys(d, tol) {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
  const polys = [];
  let cur = [];
  let pos = [0, 0], start = [0, 0];
  let lastCtrl = null, lastQ = null;
  let cmd = "";
  let i = 0;
  const num = () => Number(tokens[i++]);
  const flush = (closed) => {
    if (cur.length > 1) polys.push({ pts: cur, closed });
    cur = [];
  };
  const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const cubic = (p0, c1, c2, p) => {
    const n = segsFor(dist(p0, c1) + dist(c1, c2) + dist(c2, p), tol);
    for (let k = 1; k <= n; k++) {
      const t = k / n, u = 1 - t;
      cur.push([
        u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p[0],
        u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p[1]
      ]);
    }
  };
  const quad = (p0, c, p) => {
    const n = segsFor(dist(p0, c) + dist(c, p), tol);
    for (let k = 1; k <= n; k++) {
      const t = k / n, u = 1 - t;
      cur.push([u * u * p0[0] + 2 * u * t * c[0] + t * t * p[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p[1]]);
    }
  };
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
    else if (!cmd) {
      i++;
      continue;
    }
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    const ox = rel ? pos[0] : 0, oy = rel ? pos[1] : 0;
    switch (C) {
      case "M": {
        flush(false);
        pos = [num() + ox, num() + oy];
        start = pos;
        cur = [pos];
        cmd = rel ? "l" : "L";
        lastCtrl = lastQ = null;
        continue;
      }
      case "L":
        pos = [num() + ox, num() + oy];
        cur.push(pos);
        break;
      case "H":
        pos = [num() + ox, pos[1]];
        cur.push(pos);
        break;
      case "V":
        pos = [pos[0], num() + oy];
        cur.push(pos);
        break;
      case "C": {
        const c1 = [num() + ox, num() + oy], c2 = [num() + ox, num() + oy], p = [num() + ox, num() + oy];
        cubic(pos, c1, c2, p);
        pos = p;
        lastCtrl = c2;
        lastQ = null;
        continue;
      }
      case "S": {
        const c1 = lastCtrl ? [2 * pos[0] - lastCtrl[0], 2 * pos[1] - lastCtrl[1]] : pos;
        const c2 = [num() + ox, num() + oy], p = [num() + ox, num() + oy];
        cubic(pos, c1, c2, p);
        pos = p;
        lastCtrl = c2;
        lastQ = null;
        continue;
      }
      case "Q": {
        const c = [num() + ox, num() + oy], p = [num() + ox, num() + oy];
        quad(pos, c, p);
        pos = p;
        lastQ = c;
        lastCtrl = null;
        continue;
      }
      case "T": {
        const c = lastQ ? [2 * pos[0] - lastQ[0], 2 * pos[1] - lastQ[1]] : pos;
        const p = [num() + ox, num() + oy];
        quad(pos, c, p);
        pos = p;
        lastQ = c;
        lastCtrl = null;
        continue;
      }
      case "A": {
        const rx = num(), ry = num(), rot = num(), large = num() !== 0, sweep = num() !== 0;
        const p = [num() + ox, num() + oy];
        cur.push(...arcPoints(pos, rx, ry, rot, large, sweep, p, tol));
        pos = p;
        break;
      }
      case "Z": {
        flush(true);
        pos = start;
        cur = [pos];
        break;
      }
      default:
        i++;
    }
    lastCtrl = lastQ = null;
  }
  flush(false);
  return polys;
}
function ellipsePoly(cx, cy, rx, ry, tol) {
  const n = Math.max(24, segsFor(2 * Math.PI * Math.max(rx, ry), tol));
  const pts = [];
  for (let k = 0; k < n; k++) {
    const t = 2 * Math.PI * k / n;
    pts.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]);
  }
  return { pts, closed: true };
}
function strokeOutline(poly, w) {
  const h = w / 2;
  const pts = poly.pts;
  const n = pts.length;
  if (n < 2) return [];
  const normal = (a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
  };
  const offsetSide = (sign) => pts.map((p, k) => {
    const prev = poly.closed ? pts[(k - 1 + n) % n] : k > 0 ? pts[k - 1] : null;
    const next = poly.closed ? pts[(k + 1) % n] : k < n - 1 ? pts[k + 1] : null;
    const n1 = prev ? normal(prev, p) : normal(p, next);
    const n2 = next ? normal(p, next) : n1;
    let nx = n1[0] + n2[0], ny = n1[1] + n2[1];
    const l = Math.hypot(nx, ny) || 1;
    nx /= l;
    ny /= l;
    const cosHalf = Math.max(0.5, nx * n1[0] + ny * n1[1]);
    return [p[0] + sign * h * nx / cosHalf, p[1] + sign * h * ny / cosHalf];
  });
  if (poly.closed) {
    return [{ pts: offsetSide(1), closed: true }, { pts: offsetSide(-1).reverse(), closed: true }];
  }
  return [{ pts: [...offsetSide(1), ...offsetSide(-1).reverse()], closed: true }];
}
var attr = (attrs, name) => attrs.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1];
var numAttr = (attrs, name, def = 0) => {
  const v = Number(attr(attrs, name));
  return Number.isFinite(v) ? v : def;
};
function svgEntities(svg, tolMm) {
  const root = svg.match(/<svg\b([^>]*)>/);
  const vb = (attr(root?.[1] ?? "", "viewBox") ?? "0 0 100 100").split(/[\s,]+/).map(Number);
  const width = vb[2] ?? 100, height = vb[3] ?? 100;
  const body = svg.replace(/<!--[\s\S]*?-->/g, "").replace(/<\?xml[^>]*\?>/, "");
  const stack = [{ m: IDENT, layer: "GRABADO" }];
  const entities = [];
  for (const [, close, tag, attrs = "", selfClose] of body.matchAll(/<(\/?)([a-zA-Z]+)\b([^>]*?)(\/?)>/g)) {
    if (tag === "svg") continue;
    if (close) {
      if (tag === "g" && stack.length > 1) stack.pop();
      continue;
    }
    const parent = stack[stack.length - 1];
    const frame = {
      m: mul(parent.m, parseTransform(attr(attrs, "transform"))),
      fill: attr(attrs, "fill") ?? parent.fill,
      stroke: attr(attrs, "stroke") ?? parent.stroke,
      strokeWidth: attr(attrs, "stroke-width") !== void 0 ? numAttr(attrs, "stroke-width") : parent.strokeWidth,
      layer: attr(attrs, "id") === "INFO-NO-IMPRIMIR" ? "INFO" : parent.layer
    };
    if (tag === "g") {
      if (!selfClose) stack.push(frame);
      continue;
    }
    const tol = tolMm / scaleOf(frame.m);
    let polys = [];
    switch (tag) {
      case "path":
        polys = pathToPolys(attr(attrs, "d") ?? "", tol);
        break;
      case "circle": {
        const r = numAttr(attrs, "r");
        polys = [ellipsePoly(numAttr(attrs, "cx"), numAttr(attrs, "cy"), r, r, tol)];
        break;
      }
      case "ellipse":
        polys = [ellipsePoly(numAttr(attrs, "cx"), numAttr(attrs, "cy"), numAttr(attrs, "rx"), numAttr(attrs, "ry"), tol)];
        break;
      case "rect":
      case "image": {
        const x = numAttr(attrs, "x"), y = numAttr(attrs, "y"), w = numAttr(attrs, "width"), h = numAttr(attrs, "height");
        polys = [{ pts: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], closed: true }];
        break;
      }
      case "polygon": {
        const n = (attr(attrs, "points") ?? "").split(/[\s,]+/).filter(Boolean).map(Number);
        const pts = [];
        for (let k = 0; k + 1 < n.length; k += 2) pts.push([n[k], n[k + 1]]);
        polys = [{ pts, closed: true }];
        break;
      }
      case "line":
        polys = [{ pts: [[numAttr(attrs, "x1"), numAttr(attrs, "y1")], [numAttr(attrs, "x2"), numAttr(attrs, "y2")]], closed: false }];
        break;
      default:
        continue;
    }
    const layer = tag === "image" ? "LOGO-VECTORIZAR" : frame.layer;
    const strokeOnly = layer === "GRABADO" && frame.fill === "none" && frame.stroke && frame.stroke !== "none" && (frame.strokeWidth ?? 0) > 0;
    if (strokeOnly) polys = polys.flatMap((p) => strokeOutline(p, frame.strokeWidth));
    else if (layer === "GRABADO" && frame.fill !== "none" && tag !== "line") polys = polys.map((p) => ({ pts: p.pts, closed: true }));
    for (const p of polys) entities.push({ layer, poly: { pts: p.pts.map((pt) => apply(frame.m, pt)), closed: p.closed } });
  }
  return { entities, height, width };
}
var LAYER_COLORS = { GRABADO: 1, INFO: 8, "LOGO-VECTORIZAR": 5 };
var f = (n) => (Math.round(n * 1e3) / 1e3).toString();
function svgToDxf(svg, opts = {}) {
  const parsed = svgEntities(svg, opts.tolMm ?? 0.05);
  const { height, width } = parsed;
  const engrave = parsed.entities.filter((e) => e.layer === "GRABADO");
  const merged = unionOutlines(engrave.filter((e) => e.poly.closed).map((e) => e.poly.pts));
  const entities = [
    ...merged.map((pts) => ({ layer: "GRABADO", poly: { pts, closed: true } })),
    ...engrave.filter((e) => !e.poly.closed),
    ...parsed.entities.filter((e) => e.layer !== "GRABADO")
  ];
  const out2 = [];
  const g = (code, value) => out2.push(String(code), String(value));
  if (opts.comment) for (const line of opts.comment.split("\n")) g(999, line.replace(/[\r\n]/g, " ").slice(0, 250));
  g(0, "SECTION");
  g(2, "HEADER");
  g(9, "$ACADVER");
  g(1, "AC1009");
  g(9, "$INSUNITS");
  g(70, 4);
  g(9, "$MEASUREMENT");
  g(70, 1);
  g(9, "$EXTMIN");
  g(10, 0);
  g(20, 0);
  g(30, 0);
  g(9, "$EXTMAX");
  g(10, f(width));
  g(20, f(height));
  g(30, 0);
  g(0, "ENDSEC");
  g(0, "SECTION");
  g(2, "TABLES");
  g(0, "TABLE");
  g(2, "LAYER");
  g(70, Object.keys(LAYER_COLORS).length);
  for (const [name, color] of Object.entries(LAYER_COLORS)) {
    g(0, "LAYER");
    g(2, name);
    g(70, 0);
    g(62, color);
    g(6, "CONTINUOUS");
  }
  g(0, "ENDTAB");
  g(0, "ENDSEC");
  g(0, "SECTION");
  g(2, "ENTITIES");
  for (const { layer, poly } of entities) {
    const pts = poly.pts.filter((p, k, a) => k === 0 || p[0] !== a[k - 1][0] || p[1] !== a[k - 1][1]);
    if (poly.closed && pts.length > 2) {
      const a = pts[0], b = pts[pts.length - 1];
      if (Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6) pts.pop();
    }
    if (pts.length < 2) continue;
    g(0, "POLYLINE");
    g(8, layer);
    g(62, LAYER_COLORS[layer]);
    g(66, 1);
    g(10, 0);
    g(20, 0);
    g(30, 0);
    g(70, poly.closed ? 1 : 0);
    for (const [x, y] of pts) {
      g(0, "VERTEX");
      g(8, layer);
      g(10, f(x));
      g(20, f(height - y));
      g(30, 0);
    }
    g(0, "SEQEND");
    g(8, layer);
  }
  g(0, "ENDSEC");
  g(0, "EOF");
  return out2.join("\r\n") + "\r\n";
}

// src/lib/production-svg.ts
var PRODUCT_AREAS_MM = {
  termo: { w: 80, h: 110 },
  chopera: { w: 90, h: 85 },
  hoppie: { w: 75, h: 100 },
  vaso: { w: 70, h: 90 },
  copa: { w: 60, h: 70 },
  botella: { w: 70, h: 120 },
  guampa: { w: 60, h: 80 },
  "bol\xEDgrafo": { w: 60, h: 8 }
};
var DEFAULT_AREA_MM = { w: 80, h: 100 };
var FRONT_FACE = { uMin: 0.28, uMax: 0.72, vMin: 0.08, vMax: 0.92 };
var FACES = {
  front: { label: "FRENTE", offset: 0 },
  left: { label: "COSTADO IZQUIERDO", offset: 0.25 },
  back: { label: "DORSO", offset: 0.5 },
  right: { label: "COSTADO DERECHO", offset: -0.25 }
};
var AREA_PAD_FRAC = 0.05;
var TEXT_BASE_FRACTION = 0.35;
var ICON_BASE_FRACTION = 0.38;
var LOGO_BASE_FRACTION = 0.6;
var INFO_STRIP_MM = 18;
var mmIn = (v, lo, hi) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi ? v : null;
function parseTextSize(v) {
  if (!v || typeof v !== "object") return null;
  const o = v;
  const widthMm = mmIn(o.widthMm, 1, 2e3);
  if (!widthMm || !Array.isArray(o.lines)) return null;
  const lines = o.lines.filter((l) => typeof l === "string").slice(0, 20).map((l) => l.slice(0, 200));
  return lines.some((l) => l.trim()) ? { lines, widthMm } : null;
}
function parseRealSize(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  return {
    circumferenceMm: mmIn(o.circumferenceMm, 20, 2e3),
    bandHeightMm: mmIn(o.bandHeightMm, 5, 1e3),
    text: parseTextSize(o.text),
    text2: parseTextSize(o.text2),
    artMm: mmIn(o.artMm, 1, 1e3)
  };
}
var LASER_RED = "#ff0000";
function productionMode(technique) {
  const t = technique.toLowerCase();
  if (/uv|color/.test(t)) return "uv";
  if (/plotter|corte/.test(t)) return "cut";
  return "laser";
}
var esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var escComment = (s) => s.replace(/-{2,}/g, "-");
var round = (n) => Math.round(n * 1e3) / 1e3;
function pushHardBroken(rows, word, fits) {
  let w = word;
  while (w.length > 1 && !fits(w)) {
    let cut = 1;
    while (cut < w.length && fits(w.slice(0, cut + 1))) cut++;
    rows.push(w.slice(0, cut));
    w = w.slice(cut);
  }
  return w;
}
function wrapToWidth(text, maxWidth, measure) {
  if (!text) return [];
  const fits = (s) => measure(s) <= maxWidth;
  const rows = [];
  for (const segment of text.split("\n")) {
    let line = "";
    for (const word of segment.split(" ")) {
      if (word === "") continue;
      if (!line) line = pushHardBroken(rows, word, fits);
      else if (fits(`${line} ${word}`)) line = `${line} ${word}`;
      else {
        rows.push(line);
        line = pushHardBroken(rows, word, fits);
      }
    }
    rows.push(line);
  }
  return rows.length ? rows : [text];
}
function layoutLines(text, layout, maxWidth, measure) {
  if (!text) return [];
  switch (layout) {
    case "stack": {
      const fits = (s) => measure(s) <= maxWidth;
      const rows = [];
      for (const word of text.split(/\s+/)) {
        if (word === "") continue;
        rows.push(pushHardBroken(rows, word, fits));
      }
      return rows.length ? rows : [text];
    }
    case "manual": {
      const rows = text.split("\n");
      while (rows.length > 1 && rows[rows.length - 1] === "") rows.pop();
      return rows;
    }
    case "wrap360":
      return [text.replace(/\n+/g, " ").trim() || text];
    case "auto":
    default:
      return wrapToWidth(text, maxWidth, measure);
  }
}
function runAdvance(lf, text, size) {
  const scale = size / lf.font.unitsPerEm;
  let w = 0;
  let prev = null;
  for (const ch of text) {
    const g = lf.font.charToGlyph(ch);
    if (prev) w += lf.font.getKerningValue(prev, g) * scale;
    w += (g.advanceWidth ?? 0) * scale + lf.letterSpacing * size;
    prev = g;
  }
  return w;
}
function runPath(lf, text, x, y, size) {
  const scale = size / lf.font.unitsPerEm;
  const out2 = new import_opentype2.default.Path();
  let cx = x;
  let prev = null;
  for (const ch of text) {
    const g = lf.font.charToGlyph(ch);
    if (prev) cx += lf.font.getKerningValue(prev, g) * scale;
    out2.extend(g.getPath(cx, y, size));
    cx += (g.advanceWidth ?? 0) * scale + lf.letterSpacing * size;
    prev = g;
  }
  return out2;
}
function unionBounds(a, b) {
  if (!a) return b;
  return { x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1), x2: Math.max(a.x2, b.x2), y2: Math.max(a.y2, b.y2) };
}
function buildTextBlock(lf, lines, fontMm, lineHeightMul, align) {
  const measure = (s) => runAdvance(lf, s, fontMm);
  const rowH = fontMm * lineHeightMul;
  const widths = lines.map(measure);
  const blockW = Math.max(...widths, 0);
  const parts = [];
  let bounds = null;
  const addPath = (s, x, y) => {
    const p = runPath(lf, s, x, y, fontMm);
    const bb = p.getBoundingBox();
    if (Number.isFinite(bb.x1) && bb.x1 !== bb.x2) {
      bounds = unionBounds(bounds, { x1: bb.x1, y1: bb.y1, x2: bb.x2, y2: bb.y2 });
    }
    const d = p.toPathData(3);
    if (d) parts.push(d);
  };
  lines.forEach((line, i) => {
    const y = i * rowH;
    if (!line) return;
    if (align === "right") {
      addPath(line, blockW - widths[i], y);
      return;
    }
    if (align === "left") {
      addPath(line, 0, y);
      return;
    }
    if (align === "justify") {
      const words = line.split(" ").filter(Boolean);
      const isLast = i === lines.length - 1;
      if (!isLast && words.length >= 2 && widths[i] < blockW) {
        const wordsW = words.reduce((s, w) => s + measure(w), 0);
        const gap = (blockW - wordsW) / (words.length - 1);
        let x = 0;
        for (const w of words) {
          addPath(w, x, y);
          x += measure(w) + gap;
        }
        return;
      }
      addPath(line, 0, y);
      return;
    }
    addPath(line, (blockW - widths[i]) / 2, y);
  });
  if (!bounds || !parts.length) return null;
  return { d: parts.join(" "), bounds };
}
function fitTextBlock(lf, rawText, requestedMm, maxW, maxH, layout, lineHeightMul, align) {
  const text = lf.uppercase ? rawText.toUpperCase() : rawText;
  const minMm = 2;
  let fontMm = Math.max(minMm, requestedMm);
  let block = null;
  for (let i = 0; i < 12; i++) {
    const measure = (s) => runAdvance(lf, s, fontMm);
    const lines = layoutLines(text, layout, maxW, measure);
    block = buildTextBlock(lf, lines, fontMm, lineHeightMul, align);
    if (!block) return null;
    const w = block.bounds.x2 - block.bounds.x1;
    const h = block.bounds.y2 - block.bounds.y1;
    const ratio = Math.min(w > maxW ? maxW / w : 1, h > maxH ? maxH / h : 1);
    if (ratio >= 1 || fontMm <= minMm) break;
    const next = Math.max(minMm, fontMm * ratio * 0.98);
    if (next >= fontMm) break;
    fontMm = next;
  }
  return block;
}
function sizedTextBlock(lf, size, lineHeightMul, align) {
  const lines = size.lines.map((l) => lf.uppercase ? l.toUpperCase() : l);
  const ref = buildTextBlock(lf, lines, 10, lineHeightMul, align);
  if (!ref) return null;
  const refW = ref.bounds.x2 - ref.bounds.x1;
  if (!(refW > 0)) return null;
  return buildTextBlock(lf, lines, 10 * size.widthMm / refW, lineHeightMul, align);
}
function mergedOutline(d) {
  const polys = pathToPolys(d, 0.05).map((p) => p.pts);
  const merged = unionOutlines(polys);
  if (!merged.length) return d;
  return merged.map((p) => `M${p.map(([x, y]) => `${round(x)} ${round(y)}`).join("L")}Z`).join(" ");
}
function relPos(p) {
  const offset = FACES[p?.face ?? "front"]?.offset ?? 0;
  const u0 = typeof p?.u === "number" ? p.u - offset : 0.5;
  const u = u0 - Math.round(u0 - 0.5);
  const v = typeof p?.v === "number" ? p.v : 0.5;
  const clamp01 = (n) => Math.max(0, Math.min(1, n));
  return {
    x: clamp01((u - FRONT_FACE.uMin) / (FRONT_FACE.uMax - FRONT_FACE.uMin)),
    y: clamp01((v - FRONT_FACE.vMin) / (FRONT_FACE.vMax - FRONT_FACE.vMin))
  };
}
async function buildProductionSvg(input) {
  const mode = productionMode(input.technique);
  const front = PRODUCT_AREAS_MM[input.product.trim().toLowerCase()] ?? DEFAULT_AREA_MM;
  const free = input.placementMode === "free";
  const real = parseRealSize(input.realSize);
  const padX = front.w * AREA_PAD_FRAC;
  const padY = front.h * AREA_PAD_FRAC;
  const usableW = front.w - padX * 2;
  const usableH = front.h - padY * 2;
  const realArea = free && real.circumferenceMm && real.bandHeightMm ? { w: Math.round(real.circumferenceMm * 10) / 10, h: Math.round(real.bandHeightMm * 10) / 10 } : null;
  const area = realArea ?? (free ? {
    w: Math.round(front.w / (FRONT_FACE.uMax - FRONT_FACE.uMin)),
    h: Math.round(front.h / (FRONT_FACE.vMax - FRONT_FACE.vMin))
  } : front);
  const posOf = (p) => {
    if (free) {
      const u0 = typeof p?.u === "number" ? p.u : 0.5;
      const u = u0 - Math.round(u0 - 0.5);
      const v = typeof p?.v === "number" ? Math.max(0, Math.min(1, p.v)) : 0.5;
      return { cx: u * area.w, cy: v * area.h };
    }
    const rel = relPos(p);
    return { cx: padX + rel.x * usableW, cy: padY + rel.y * usableH };
  };
  const seamCheck = (cx, halfW, label) => {
    if (free && (cx - halfW < 0 || cx + halfW > area.w)) {
      warnings.push(`${label[0].toUpperCase()}${label.slice(1)} cruza la costura del archivo (atr\xE1s): unir los dos lados al grabar.`);
    }
  };
  const CUT_STROKE_MM = 0.25;
  const fillAttrsFor = (uvColor) => {
    if (mode === "cut") return `fill="none" stroke="#000000" stroke-width="${CUT_STROKE_MM}"`;
    if (mode === "uv") return `fill="${esc(uvColor || "#000000")}"`;
    return `fill="${LASER_RED}"`;
  };
  const body = [];
  const warnings = [];
  const sizes = [];
  const cm = (mm) => (Math.round(mm) / 10).toLocaleString("es-PY", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const addText = async (raw, fontId, placement, id, label, sized) => {
    const text = (raw ?? "").trim();
    if (!text) return;
    const lf = await loadProductionFont(fontId);
    if (!lf) {
      warnings.push(`No se pudo cargar la fuente del ${label} (${fontId ?? "?"}); texto omitido \u2014 regenerar a mano.`);
      return;
    }
    const p = placement ?? {};
    const vertical = p.orientation === "vertical";
    const scale = typeof p.scale === "number" && p.scale > 0 ? p.scale : 1;
    const layout = p.layout ?? "auto";
    const align = p.align ?? "center";
    const lineHeightMul = typeof p.lineHeight === "number" ? p.lineHeight : 1.12;
    const roomW = free ? area.w * 0.5 : usableW;
    const roomH = free ? area.h * 0.92 : usableH;
    const maxW = vertical ? roomH : roomW;
    const maxH = vertical ? roomW : roomH;
    const requestedMm = usableH * TEXT_BASE_FRACTION * scale;
    const block = (sized && sizedTextBlock(lf, sized, lineHeightMul, align)) ?? fitTextBlock(lf, text, requestedMm, maxW, maxH, layout, lineHeightMul, align);
    if (!block) return;
    const { cx, cy } = posOf(placement);
    const bcx = (block.bounds.x1 + block.bounds.x2) / 2;
    const bcy = (block.bounds.y1 + block.bounds.y2) / 2;
    const rotate = vertical ? ` rotate(-90 ${round(bcx)} ${round(bcy)})` : "";
    body.push(
      `  <g id="${id}" transform="translate(${round(cx - bcx)} ${round(cy - bcy)})${rotate}">`,
      `    <path d="${mode === "laser" ? mergedOutline(block.d) : block.d}" ${fillAttrsFor(input.textColor)}/>`,
      `  </g>`
    );
    const bw = block.bounds.x2 - block.bounds.x1, bh = block.bounds.y2 - block.bounds.y1;
    sizes.push(`${label[0].toUpperCase()}${label.slice(1)}: ${cm(bw)} \xD7 ${cm(bh)} cm (largo \xD7 alto)${sized ? "" : " aprox."}`);
    if ((p.layout ?? "auto") === "wrap360") {
      warnings.push(`${label[0].toUpperCase()}${label.slice(1)} envolvente 360\xB0: en este archivo va como una sola l\xEDnea; envolver alrededor del cuerpo.`);
    } else if (free) {
      seamCheck(cx, (vertical ? bh : bw) / 2, label);
    } else {
      const face = FACES[p.face ?? "front"];
      if (face && face.offset !== 0) warnings.push(`${label[0].toUpperCase()}${label.slice(1)} en el ${face.label} (no en el frente).`);
    }
  };
  await addText(input.text, input.fontId, input.textPlacement, "texto", "texto", real.text);
  await addText(input.text2, input.text2FontId, input.text2Placement, "texto-2", "texto 2", real.text2);
  const icon = productionIconById(input.iconId);
  if (icon) {
    const p = input.artPlacement ?? {};
    const scale = typeof p.scale === "number" && p.scale > 0 ? p.scale : 1;
    const box = real.artMm ?? Math.min(usableW, usableH) * ICON_BASE_FRACTION * scale;
    const { cx, cy } = posOf(input.artPlacement);
    seamCheck(cx, box / 2, "el \xEDcono");
    let iconBody = icon.body;
    if (mode === "cut") {
      const strokeU = round(CUT_STROKE_MM * 24 / box);
      iconBody = iconBody.replace(/fill="currentColor"/g, `fill="none" stroke="#000000" stroke-width="${strokeU}"`).replace(/stroke="currentColor"/g, `stroke="#000000"`);
    } else {
      iconBody = iconBody.replace(/currentColor/g, mode === "laser" ? LASER_RED : "#000000");
    }
    body.push(
      `  <g id="icono-${esc(icon.id)}" transform="translate(${round(cx - box / 2)} ${round(cy - box / 2)}) scale(${round(box / 24)})">`,
      `    ${iconBody}`,
      `  </g>`
    );
  }
  const dataUrl = input.customImageDataUrl?.trim();
  if (dataUrl && /^data:image\/(png|jpeg|svg\+xml|webp);base64,/.test(dataUrl)) {
    const p = input.artPlacement ?? {};
    const scale = typeof p.scale === "number" && p.scale > 0 ? p.scale : 1;
    const box = real.artMm ?? Math.min(usableW * LOGO_BASE_FRACTION * scale, usableW, usableH);
    const { cx, cy } = posOf(input.artPlacement);
    seamCheck(cx, box / 2, "el logo del cliente");
    body.push(
      `  <!-- LOGO RASTER - revisar/vectorizar manualmente si es grabado l\xE1ser -->`,
      `  <image id="logo-cliente" x="${round(cx - box / 2)}" y="${round(cy - box / 2)}" width="${round(box)}" height="${round(box)}" preserveAspectRatio="xMidYMid meet" href="${dataUrl}"/>`
    );
    if (mode === "laser") warnings.push("Incluye logo/foto raster: vectorizar antes de grabar a l\xE1ser.");
  }
  const extra = (label, v) => {
    if (typeof v !== "string") return;
    const t = v.trim();
    warnings.push(t ? `Grabar tambi\xE9n en la ${label}: "${t}"` : `Grabar tambi\xE9n en la ${label} (texto a definir con el cliente).`);
  };
  extra("TAPA", input.extraLid);
  extra("BASE", input.extraBase);
  const infoStripMm = Math.max(INFO_STRIP_MM, 8 + (2 + sizes.length + warnings.length) * 3 * 1.35);
  const totalH = area.h + infoStripMm;
  const dateStr = input.createdAt.toISOString().slice(0, 10);
  const infoLines = [
    `PEDIDO ${input.orderNumber} \xB7 ${input.product.toUpperCase()} \xB7 ${input.technique.toUpperCase()}`,
    free ? `Vuelta completa (360\xB0): ${area.w}\xD7${area.h} mm${realArea ? "" : " aprox."} \xB7 frente al centro \xB7 ${dateStr} \xB7 CAPA NO IMPRIMIR` : `\xC1rea grabable: ${area.w}\xD7${area.h} mm \xB7 ${dateStr} \xB7 CAPA NO IMPRIMIR`,
    ...sizes,
    ...warnings
  ];
  const infoFont = await loadInfoFont();
  const infoPaths = [];
  if (infoFont) {
    const size = 3;
    infoLines.forEach((line, i) => {
      const p = runPath(infoFont, line, padX, area.h + 6 + i * (size * 1.35), size);
      const d = p.toPathData(3);
      if (d) infoPaths.push(`    <path d="${d}" fill="#888888"/>`);
    });
  }
  const meta = escComment(
    [
      `ARCHIVO DE PRODUCCION - USO INTERNO - NO ENVIAR AL CLIENTE`,
      `Pedido: ${input.orderNumber}`,
      `Producto: ${input.product}`,
      `T\xE9cnica: ${input.technique} (modo ${mode})`,
      `\xC1rea grabable: ${area.w}x${area.h} mm`,
      `Fecha: ${dateStr}`,
      ...warnings
    ].join(" | ")
  );
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<!-- ${meta} -->`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${area.w}mm" height="${totalH}mm" viewBox="0 0 ${area.w} ${totalH}">`,
    ...body,
    `  <g id="INFO-NO-IMPRIMIR">`,
    `    <!-- Capa informativa para el operario: borrar antes de producir. -->`,
    `    <rect x="0" y="0" width="${area.w}" height="${area.h}" fill="none" stroke="#bbbbbb" stroke-width="0.2" stroke-dasharray="2 1.5"/>`,
    `    <line x1="0" y1="${area.h + 2}" x2="${area.w}" y2="${area.h + 2}" stroke="#bbbbbb" stroke-width="0.2"/>`,
    ...infoPaths,
    `  </g>`,
    `</svg>`,
    ``
  ].join("\n");
}

// src/lib/__laser-check.ts
var out = process.argv[2];
var dxfPolys = (dxf, layer) => {
  const t = dxf.split("\r\n");
  const polys = [];
  let cur = null;
  for (let i = 0; i + 1 < t.length; i += 2) {
    const c = t[i].trim(), v = t[i + 1];
    if (c === "0" && v === "POLYLINE") {
      cur = t[i + 3] === layer ? [] : null;
      if (cur) polys.push(cur);
    }
    if (c === "0" && v === "VERTEX" && cur) cur.push([Number(t[i + 5]), Number(t[i + 7])]);
  }
  return polys;
};
for (const [name, fontId, text, lines, widthMm] of [
  ["milkshake", "f14", "fabri", ["fabri"], 60],
  ["pacifico", "f15", "Maria Jose", ["Maria Jose"], 75],
  ["abril", "f1", "fabri", ["fabri"], 50],
  ["versalita", "f22", "Version B", ["VERSION B"], 55]
]) {
  const base = {
    orderNumber: "CS-TEST",
    product: "Vaso Sunbeam",
    technique: "Grabado l\xE1ser",
    createdAt: /* @__PURE__ */ new Date("2026-11-10"),
    text,
    fontId,
    textPlacement: { u: 0.5, v: 0.4, scale: 0.6 },
    placementMode: "free"
  };
  const svg = await buildProductionSvg({ ...base, realSize: { circumferenceMm: 290, bandHeightMm: 150, text: { lines: [...lines], widthMm } } });
  const dxf = svgToDxf(svg);
  writeFileSync(`${out}/${name}.svg`, svg);
  writeFileSync(`${out}/${name}.dxf`, dxf);
  const g = dxfPolys(dxf, "GRABADO");
  const xs = g.flat().map((p) => p[0]), ys = g.flat().map((p) => p[1]);
  const rawD = (await buildProductionSvg({ ...base, technique: "Impresi\xF3n UV color" })).match(/<path d="([^"]*)"/)?.[1] ?? "";
  const raw = pathToPolys(rawD, 0.05).map((p) => p.pts);
  console.log(
    name.padEnd(10),
    "antes: contornos",
    String(raw.length).padStart(2),
    "cruces",
    outlinesCross(raw),
    "| ahora: contornos",
    String(g.length).padStart(2),
    "cruces",
    outlinesCross(g),
    "| ancho",
    (Math.max(...xs) - Math.min(...xs)).toFixed(2),
    "mm (pedido",
    widthMm + ")",
    "alto",
    (Math.max(...ys) - Math.min(...ys)).toFixed(2),
    "| rojo svg",
    /<g id="texto"[^>]*>\s*<path [^>]*fill="#ff0000"/.test(svg),
    "| zonas",
    /no-grabar|MANIJA/.test(svg),
    "| color capa",
    dxf.match(/LAYER\r\n2\r\nGRABADO\r\n70\r\n0\r\n62\r\n(\d+)/)?.[1]
  );
}
