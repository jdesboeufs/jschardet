(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.jschardet = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = require('./src')
},{"./src":6}],2:[function(require,module,exports){
/*
 * The Original Code is Mozilla Universal charset detector code.
 *
 * The Initial Developer of the Original Code is
 * Netscape Communications Corporation.
 * Portions created by the Initial Developer are Copyright (C) 2001
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   António Afonso (antonio.afonso gmail.com) - port to JavaScript
 *   Mark Pilgrim - port to Python
 *   Shy Shalom - original C code
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301  USA
 */

var constants = require('./constants');
var CharSetProber = require('./charsetprober');
var logger = require('./logger');

function CharSetGroupProber() {
    CharSetProber.apply(this);

    var self = this;

    function init() {
        self._mActiveNum = 0;
        self._mProbers = [];
        self._mBestGuessProber = null;
    }

    this.reset = function() {
        CharSetGroupProber.prototype.reset.apply(this);
        this._mActiveNum = 0;
        for( var i = 0, prober; prober = this._mProbers[i]; i++ ) {
            if( prober ) {
                prober.reset();
                prober.active = true;
                this._mActiveNum++;
            }
        }
        this._mBestGuessProber = null;
    }

    this.getCharsetName = function() {
        if( !this._mBestGuessProber ) {
            this.getConfidence();
            if( !this._mBestGuessProber ) return null;
        }
        return this._mBestGuessProber.getCharsetName();
    }

    this.feed = function(aBuf) {
        for( var i = 0, prober; prober = this._mProbers[i]; i++ ) {
            if( !prober || !prober.active ) continue;
            var st = prober.feed(aBuf);
            if( !st ) continue;
            if( st == constants.foundIt ) {
                this._mBestGuessProber = prober;
                return this.getState();
            } else if( st == constants.notMe ) {
                prober.active = false;
                this._mActiveNum--;
                if( this._mActiveNum <= 0 ) {
                    this._mState = constants.notMe;
                    return this.getState();
                }
            }
        }
        return this.getState();
    }

    this.getConfidence = function() {
        var st = this.getState();
        if( st == constants.foundIt ) {
            return 0.99;
        } else if( st == constants.notMe ) {
            return 0.01;
        }
        var bestConf = 0.0;
        this._mBestGuessProber = null;
        for( var i = 0, prober; prober = this._mProbers[i]; i++ ) {
            if( !prober ) continue;
            if( !prober.active ) {
                if( logger.enabled ) {
                    logger.log(prober.getCharsetName() + " not active\n");
                }
                continue;
            }
            var cf = prober.getConfidence();
            if( logger.enabled ) {
                logger.log(prober.getCharsetName() + " confidence = " + cf + "\n");
            }
            if( bestConf < cf ) {
                bestConf = cf;
                this._mBestGuessProber = prober;
            }
        }
        if( !this._mBestGuessProber ) return 0.0;
        return bestConf;
    }

    init();
}
CharSetGroupProber.prototype = new CharSetProber();

module.exports = CharSetGroupProber

},{"./charsetprober":3,"./constants":5,"./logger":8}],3:[function(require,module,exports){
/*
 * The Original Code is Mozilla Universal charset detector code.
 *
 * The Initial Developer of the Original Code is
 * Netscape Communications Corporation.
 * Portions created by the Initial Developer are Copyright (C) 2001
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   António Afonso (antonio.afonso gmail.com) - port to JavaScript
 *   Mark Pilgrim - port to Python
 *   Shy Shalom - original C code
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301  USA
 */

var constants = require('./constants')

function CharSetProber() {
    this.reset = function() {
        this._mState = constants.detecting;
    }

    this.getCharsetName = function() {
        return null;
    }

    this.feed = function(aBuf) {
    }

    this.getState = function() {
        return this._mState;
    }

    this.getConfidence = function() {
        return 0.0;
    }

    this.filterHighBitOnly = function(aBuf) {
        aBuf = aBuf.replace(/[\x00-\x7F]+/g, " ");
        return aBuf;
    }

    this.filterWithoutEnglishLetters = function(aBuf) {
        aBuf = aBuf.replace(/[A-Za-z]+/g, " ");
        return aBuf;
    }

    // Input: aBuf is a string containing all different types of characters
    // Output: a string that contains all alphabetic letters, high-byte characters, and word immediately preceding `>`, but nothing else within `<>`
    // Ex: input - '¡£º <div blah blah> abcdef</div> apples! * and oranges 9jd93jd>'
    //     output - '¡£º blah div apples and oranges jd jd '
    this.filterWithEnglishLetters = function(aBuf) {
        var result = '';
        var inTag = false;
        var prev = 0;

        for (var curr = 0; curr < aBuf.length; curr++) {
          var c = aBuf[curr];

          if (c == '>') {
            inTag = false;
          } else if (c == '<') {
            inTag = true;
          }

          var isAlpha = /[a-zA-Z]/.test(c);
          var isASCII = /^[\x00-\x7F]*$/.test(c);

          if (isASCII && !isAlpha) {
            if (curr > prev && !inTag) {
              result = result + aBuf.substring(prev, curr) + ' ';
            }

            prev = curr + 1;
          }
        }

        if (!inTag) {
          result = result + aBuf.substring(prev);
        }

        return result;
    }
}

module.exports = CharSetProber

},{"./constants":5}],4:[function(require,module,exports){
/*
 * The Original Code is Mozilla Universal charset detector code.
 *
 * The Initial Developer of the Original Code is
 * Netscape Communications Corporation.
 * Portions created by the Initial Developer are Copyright (C) 2001
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   António Afonso (antonio.afonso gmail.com) - port to JavaScript
 *   Mark Pilgrim - port to Python
 *   Shy Shalom - original C code
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301  USA
 */

var constants = require('./constants')

function CodingStateMachine(sm) {
    var self = this;

    function init(sm) {
        self._mModel = sm;
        self._mCurrentBytePos = 0;
        self._mCurrentCharLen = 0;
        self.reset();
    }

    this.reset = function() {
        this._mCurrentState = constants.start;
    }

    this.nextState = function(c) {
        // for each byte we get its class
        // if it is first byte, we also get byte length
        var byteCls = this._mModel.classTable[c.charCodeAt(0)];
        if( this._mCurrentState == constants.start ) {
            this._mCurrentBytePos = 0;
            this._mCurrentCharLen = this._mModel.charLenTable[byteCls];
        }
        // from byte's class and stateTable, we get its next state
        this._mCurrentState = this._mModel.stateTable[this._mCurrentState * this._mModel.classFactor + byteCls];
        this._mCurrentBytePos++;
        return this._mCurrentState;
    }

    this.getCurrentCharLen = function() {
        return this._mCurrentCharLen;
    }

    this.getCodingStateMachine = function() {
        return this._mModel.name;
    }

    init(sm);
}

module.exports = CodingStateMachine

},{"./constants":5}],5:[function(require,module,exports){
/*
 * The Original Code is Mozilla Universal charset detector code.
 *
 * The Initial Developer of the Original Code is
 * Netscape Communications Corporation.
 * Portions created by the Initial Developer are Copyright (C) 2001
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   António Afonso (antonio.afonso gmail.com) - port to JavaScript
 *   Mark Pilgrim - port to Python
 *   Shy Shalom - original C code
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301  USA
 */

module.exports = {
    detecting   : 0,
    foundIt     : 1,
    notMe       : 2,

    start       : 0,
    error       : 1,
    itsMe       : 2,

    SHORTCUT_THRESHOLD  : 0.95
};

},{}],6:[function(require,module,exports){
/*
 * The Original Code is Mozilla Universal charset detector code.
 *
 * The Initial Developer of the Original Code is
 * Netscape Communications Corporation.
 * Portions created by the Initial Developer are Copyright (C) 2001
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   António Afonso (antonio.afonso gmail.com) - port to JavaScript
 *   Mark Pilgrim - port to Python
 *   Shy Shalom - original C code
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301  USA
 */

var UniversalDetector = require('./universaldetector');
var setLogger = require('./logger').setLogger;

exports.VERSION = "1.4.1";
exports.detect = function(buffer, options) {
    var u = new UniversalDetector(options);
    u.reset();
    if( typeof Buffer == 'function' && buffer instanceof Buffer ) {
        u.feed(buffer.toString('binary'));
    } else {
        u.feed(buffer);
    }
    u.close();
    return u.result;
}
exports.UniversalDetector = UniversalDetector;
exports.setLogger = setLogger;

},{"./logger":8,"./universaldetector":11}],7:[function(require,module,exports){
/*
 * The Original Code is Mozilla Universal charset detector code.
 *
 * The Initial Developer of the Original Code is
 * Netscape Communications Corporation.
 * Portions created by the Initial Developer are Copyright (C) 2001
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   António Afonso (antonio.afonso gmail.com) - port to JavaScript
 *   Mark Pilgrim - port to Python
 *   Shy Shalom - original C code
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301  USA
 */

var CharSetProber = require('./charsetprober');
var Constants = require('./constants');

var UDF = 0; // undefined
var OTH = 1; // other
var ASC = 2; // ascii capital letter
var ASS = 3; // ascii small letter
var ACV = 4; // accent capital vowel
var ACO = 5; // accent capital other
var ASV = 6; // accent small vowel
var ASO = 7; // accent small other

var Latin1_CharToClass = [
  OTH, OTH, OTH, OTH, OTH, OTH, OTH, OTH,   // 00 - 07
  OTH, OTH, OTH, OTH, OTH, OTH, OTH, OTH,   // 08 - 0F
  OTH, OTH, OTH, OTH, OTH, OTH, OTH, OTH,   // 10 - 17
  OTH, OTH, OTH, OTH, OTH, OTH, OTH, OTH,   // 18 - 1F
  OTH, OTH, OTH, OTH, OTH, OTH, OTH, OTH,   // 20 - 27
  OTH, OTH, OTH, OTH, OTH, OTH, OTH, OTH,   // 28 - 2F
  OTH, OTH, OTH, OTH, OTH, OTH, OTH, OTH,   // 30 - 37
  OTH, OTH, OTH, OTH, OTH, OTH, OTH, OTH,   // 38 - 3F
  OTH, ASC, ASC, ASC, ASC, ASC, ASC, ASC,   // 40 - 47
  ASC, ASC, ASC, ASC, ASC, ASC, ASC, ASC,   // 48 - 4F
  ASC, ASC, ASC, ASC, ASC, ASC, ASC, ASC,   // 50 - 57
  ASC, ASC, ASC, OTH, OTH, OTH, OTH, OTH,   // 58 - 5F
  OTH, ASS, ASS, ASS, ASS, ASS, ASS, ASS,   // 60 - 67
  ASS, ASS, ASS, ASS, ASS, ASS, ASS, ASS,   // 68 - 6F
  ASS, ASS, ASS, ASS, ASS, ASS, ASS, ASS,   // 70 - 77
  ASS, ASS, ASS, OTH, OTH, OTH, OTH, OTH,   // 78 - 7F
  OTH, UDF, OTH, ASO, OTH, OTH, OTH, OTH,   // 80 - 87
  OTH, OTH, ACO, OTH, ACO, UDF, ACO, UDF,   // 88 - 8F
  UDF, OTH, OTH, OTH, OTH, OTH, OTH, OTH,   // 90 - 97
  OTH, OTH, ASO, OTH, ASO, UDF, ASO, ACO,   // 98 - 9F
  OTH, OTH, OTH, OTH, OTH, OTH, OTH, OTH,   // A0 - A7
  OTH, OTH, OTH, OTH, OTH, OTH, OTH, OTH,   // A8 - AF
  OTH, OTH, OTH, OTH, OTH, OTH, OTH, OTH,   // B0 - B7
  OTH, OTH, OTH, OTH, OTH, OTH, OTH, OTH,   // B8 - BF
  ACV, ACV, ACV, ACV, ACV, ACV, ACO, ACO,   // C0 - C7
  ACV, ACV, ACV, ACV, ACV, ACV, ACV, ACV,   // C8 - CF
  ACO, ACO, ACV, ACV, ACV, ACV, ACV, OTH,   // D0 - D7
  ACV, ACV, ACV, ACV, ACV, ACO, ACO, ACO,   // D8 - DF
  ASV, ASV, ASV, ASV, ASV, ASV, ASO, ASO,   // E0 - E7
  ASV, ASV, ASV, ASV, ASV, ASV, ASV, ASV,   // E8 - EF
  ASO, ASO, ASV, ASV, ASV, ASV, ASV, OTH,   // F0 - F7
  ASV, ASV, ASV, ASV, ASV, ASO, ASO, ASO    // F8 - FF
];

// 0 : illegal
// 1 : very unlikely
// 2 : normal
// 3 : very likely
var Latin1ClassModel = [
// UDF OTH ASC ASS ACV ACO ASV ASO
   0,  0,  0,  0,  0,  0,  0,  0,  // UDF
   0,  3,  3,  3,  3,  3,  3,  3,  // OTH
   0,  3,  3,  3,  3,  3,  3,  3,  // ASC
   0,  3,  3,  3,  1,  1,  3,  3,  // ASS
   0,  3,  3,  3,  1,  2,  1,  2,  // ACV
   0,  3,  3,  3,  3,  3,  3,  3,  // ACO
   0,  3,  1,  3,  1,  1,  1,  3,  // ASV
   0,  3,  1,  3,  1,  1,  3,  3   // ASO
];

function Latin1Prober() {
    CharSetProber.apply(this);

    var FREQ_CAT_NUM = 4;
    var CLASS_NUM = 8; // total classes
    var self = this;

    function init() {
        self.reset();
    }

    this.reset = function() {
        this._mLastCharClass = OTH;
        this._mFreqCounter = [];
        for( var i = 0; i < FREQ_CAT_NUM; this._mFreqCounter[i++] = 0 );
        Latin1Prober.prototype.reset.apply(this);
    }

    this.getCharsetName = function() {
        return "windows-1252";
    }

    this.feed = function(aBuf) {
        aBuf = this.filterWithEnglishLetters(aBuf);
        for( var i = 0; i < aBuf.length; i++ ) {
            var c = aBuf.charCodeAt(i);
            var charClass = Latin1_CharToClass[c];
            var freq = Latin1ClassModel[(this._mLastCharClass * CLASS_NUM) + charClass];
            if( freq == 0 ) {
                this._mState = Constants.notMe;
                break;
            }
            this._mFreqCounter[freq]++;
            this._mLastCharClass = charClass;
        }

        return this.getState();
    }

    this.getConfidence = function() {
        var confidence;
        var constants;

        if( this.getState() == Constants.notMe ) {
            return 0.01;
        }

        var total = 0;
        for( var i = 0; i < this._mFreqCounter.length; i++ ) {
            total += this._mFreqCounter[i];
        }
        if( total < 0.01 ) {
            constants = 0.0;
        } else {
            confidence = (this._mFreqCounter[3] / total) - (this._mFreqCounter[1] * 20 / total);
        }
        if( confidence < 0 ) {
            confidence = 0.0;
        }
        // lower the confidence of latin1 so that other more accurate detector
        // can take priority.
        //
        // antonio.afonso: need to change this otherwise languages like pt, es, fr using latin1 will never be detected.
        confidence = confidence * 0.95;
        return confidence;
    }

    init();
}
Latin1Prober.prototype = new CharSetProber();

module.exports = Latin1Prober

},{"./charsetprober":3,"./constants":5}],8:[function(require,module,exports){
// By default, do nothing
exports.log = function () {};

exports.setLogger = function setLogger(fn) {
  exports.enabled = true;
  if (fn) {
    exports.log = fn;
  } else {
    exports.log = function () {
      console.log.apply(console, arguments);
    }
  }
};

},{}],9:[function(require,module,exports){
/*
 * The Original Code is Mozilla Universal charset detector code.
 *
 * The Initial Developer of the Original Code is
 * Netscape Communications Corporation.
 * Portions created by the Initial Developer are Copyright (C) 2001
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   António Afonso (antonio.afonso gmail.com) - port to JavaScript
 *   Mark Pilgrim - port to Python
 *   Shy Shalom - original C code
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301  USA
 */

var CharSetGroupProber = require('./charsetgroupprober');
// var Big5Prober = require('./big5prober');
var UTF8Prober = require('./utf8prober');
// var SJISProber = require('./sjisprober');
// var EUCJPProber = require('./eucjpprober');
// var GB2312Prober = require('./gb2312prober');
// var EUCKRProber = require('./euckrprober');
// var EUCTWProber = require('./euctwprober');

function MBCSGroupProber() {
    CharSetGroupProber.apply(this);
    this._mProbers = [
        new UTF8Prober() //,
        // new SJISProber(),
        // new EUCJPProber(),
        // new GB2312Prober(),
        // new EUCKRProber(),
        // new Big5Prober(),
        // new EUCTWProber()
    ];
    this.reset();
}
MBCSGroupProber.prototype = new CharSetGroupProber();

module.exports = MBCSGroupProber

},{"./charsetgroupprober":2,"./utf8prober":12}],10:[function(require,module,exports){
var consts = require('../constants');

var UTF8_cls = [
    1,1,1,1,1,1,1,1,  // 00 - 07  //allow 0x00 as a legal value
    1,1,1,1,1,1,0,0,  // 08 - 0f
    1,1,1,1,1,1,1,1,  // 10 - 17
    1,1,1,0,1,1,1,1,  // 18 - 1f
    1,1,1,1,1,1,1,1,  // 20 - 27
    1,1,1,1,1,1,1,1,  // 28 - 2f
    1,1,1,1,1,1,1,1,  // 30 - 37
    1,1,1,1,1,1,1,1,  // 38 - 3f
    1,1,1,1,1,1,1,1,  // 40 - 47
    1,1,1,1,1,1,1,1,  // 48 - 4f
    1,1,1,1,1,1,1,1,  // 50 - 57
    1,1,1,1,1,1,1,1,  // 58 - 5f
    1,1,1,1,1,1,1,1,  // 60 - 67
    1,1,1,1,1,1,1,1,  // 68 - 6f
    1,1,1,1,1,1,1,1,  // 70 - 77
    1,1,1,1,1,1,1,1,  // 78 - 7f
    2,2,2,2,3,3,3,3,  // 80 - 87
    4,4,4,4,4,4,4,4,  // 88 - 8f
    4,4,4,4,4,4,4,4,  // 90 - 97
    4,4,4,4,4,4,4,4,  // 98 - 9f
    5,5,5,5,5,5,5,5,  // a0 - a7
    5,5,5,5,5,5,5,5,  // a8 - af
    5,5,5,5,5,5,5,5,  // b0 - b7
    5,5,5,5,5,5,5,5,  // b8 - bf
    0,0,6,6,6,6,6,6,  // c0 - c7
    6,6,6,6,6,6,6,6,  // c8 - cf
    6,6,6,6,6,6,6,6,  // d0 - d7
    6,6,6,6,6,6,6,6,  // d8 - df
    7,8,8,8,8,8,8,8,  // e0 - e7
    8,8,8,8,8,9,8,8,  // e8 - ef
    10,11,11,11,11,11,11,11,  // f0 - f7
    12,13,13,13,14,15,0,0    // f8 - ff
];

var UTF8_st = [
    consts.error,consts.start,consts.error,consts.error,consts.error,consts.error,    12,  10, //00-07
        9,    11,    8,    7,    6,    5,    4,   3, //08-0f
    consts.error,consts.error,consts.error,consts.error,consts.error,consts.error,consts.error,consts.error, //10-17
    consts.error,consts.error,consts.error,consts.error,consts.error,consts.error,consts.error,consts.error, //18-1f
    consts.itsMe,consts.itsMe,consts.itsMe,consts.itsMe,consts.itsMe,consts.itsMe,consts.itsMe,consts.itsMe, //20-27
    consts.itsMe,consts.itsMe,consts.itsMe,consts.itsMe,consts.itsMe,consts.itsMe,consts.itsMe,consts.itsMe, //28-2f
    consts.error,consts.error,    5,    5,    5,    5,consts.error,consts.error, //30-37
    consts.error,consts.error,consts.error,consts.error,consts.error,consts.error,consts.error,consts.error, //38-3f
    consts.error,consts.error,consts.error,    5,    5,    5,consts.error,consts.error, //40-47
    consts.error,consts.error,consts.error,consts.error,consts.error,consts.error,consts.error,consts.error, //48-4f
    consts.error,consts.error,    7,    7,    7,    7,consts.error,consts.error, //50-57
    consts.error,consts.error,consts.error,consts.error,consts.error,consts.error,consts.error,consts.error, //58-5f
    consts.error,consts.error,consts.error,consts.error,    7,    7,consts.error,consts.error, //60-67
    consts.error,consts.error,consts.error,consts.error,consts.error,consts.error,consts.error,consts.error, //68-6f
    consts.error,consts.error,    9,    9,    9,    9,consts.error,consts.error, //70-77
    consts.error,consts.error,consts.error,consts.error,consts.error,consts.error,consts.error,consts.error, //78-7f
    consts.error,consts.error,consts.error,consts.error,consts.error,    9,consts.error,consts.error, //80-87
    consts.error,consts.error,consts.error,consts.error,consts.error,consts.error,consts.error,consts.error, //88-8f
    consts.error,consts.error,   12,   12,   12,   12,consts.error,consts.error, //90-97
    consts.error,consts.error,consts.error,consts.error,consts.error,consts.error,consts.error,consts.error, //98-9f
    consts.error,consts.error,consts.error,consts.error,consts.error,   12,consts.error,consts.error, //a0-a7
    consts.error,consts.error,consts.error,consts.error,consts.error,consts.error,consts.error,consts.error, //a8-af
    consts.error,consts.error,   12,   12,   12,consts.error,consts.error,consts.error, //b0-b7
    consts.error,consts.error,consts.error,consts.error,consts.error,consts.error,consts.error,consts.error, //b8-bf
    consts.error,consts.error,consts.start,consts.start,consts.start,consts.start,consts.error,consts.error, //c0-c7
    consts.error,consts.error,consts.error,consts.error,consts.error,consts.error,consts.error,consts.error  //c8-cf
];

var UTF8CharLenTable = [0, 1, 0, 0, 0, 0, 2, 3, 3, 3, 4, 4, 5, 5, 6, 6];

module.exports = {
    "classTable"    : UTF8_cls,
    "classFactor"   : 16,
    "stateTable"    : UTF8_st,
    "charLenTable"  : UTF8CharLenTable,
    "name"          : "UTF-8"
};

},{"../constants":5}],11:[function(require,module,exports){
/*
 * The Original Code is Mozilla Universal charset detector code.
 *
 * The Initial Developer of the Original Code is
 * Netscape Communications Corporation.
 * Portions created by the Initial Developer are Copyright (C) 2001
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   António Afonso (antonio.afonso gmail.com) - port to JavaScript
 *   Mark Pilgrim - port to Python
 *   Shy Shalom - original C code
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301  USA
 */

/**
 * This is a port from the python port, version "2.0.1"
 */

var constants = require('./constants');
var MBCSGroupProber = require('./mbcsgroupprober');
// var SBCSGroupProber = require('./sbcsgroupprober');
var Latin1Prober = require('./latin1prober');
// var EscCharSetProber = require('./escprober')
var logger = require('./logger');

function UniversalDetector(options) {
    if (!options) options = {};
    if (!options.minimumThreshold)  options.minimumThreshold = 0.20;

    var _state = {
        pureAscii   : 0,
        escAscii    : 1,
        highbyte    : 2
    };
    var self = this;

    function init() {
        self._highBitDetector = /[\x80-\xFF]/;
        self._escDetector = /(\x1B|~\{)/;
        self._mEscCharsetProber = null;
        self._mCharsetProbers = [];
        self.reset();
    }

    this.reset = function() {
        this.result = {"encoding": null, "confidence": 0.0};
        this.done = false;
        this._mStart = true;
        this._mGotData = false;
        this._mInputState = _state.pureAscii;
        this._mLastChar = "";
        this._mBOM = "";
        if( this._mEscCharsetProber ) {
            this._mEscCharsetProber.reset();
        }
        for( var i = 0, prober; prober = this._mCharsetProbers[i]; i++ ) {
            prober.reset();
        }
    }

    this.feed = function(aBuf) {
        if( this.done ) return;

        var aLen = aBuf.length;
        if( !aLen ) return;

        if( !this._mGotData ) {
            this._mBOM += aBuf;
            // If the data starts with BOM, we know it is UTF
            if( this._mBOM.slice(0,3) == "\xEF\xBB\xBF" ) {
                // EF BB BF  UTF-8 with BOM
                this.result = {"encoding": "UTF-8", "confidence": 1.0};
            } else if( this._mBOM.slice(0,4) == "\xFF\xFE\x00\x00" ) {
                // FF FE 00 00  UTF-32, little-endian BOM
                this.result = {"encoding": "UTF-32LE", "confidence": 1.0};
            } else if( this._mBOM.slice(0,4) == "\x00\x00\xFE\xFF" ) {
                // 00 00 FE FF  UTF-32, big-endian BOM
                this.result = {"encoding": "UTF-32BE", "confidence": 1.0};
            } else if( this._mBOM.slice(0,4) == "\xFE\xFF\x00\x00" ) {
                // FE FF 00 00  UCS-4, unusual octet order BOM (3412)
                this.result = {"encoding": "X-ISO-10646-UCS-4-3412", "confidence": 1.0};
            } else if( this._mBOM.slice(0,4) == "\x00\x00\xFF\xFE" ) {
                // 00 00 FF FE  UCS-4, unusual octet order BOM (2143)
                this.result = {"encoding": "X-ISO-10646-UCS-4-2143", "confidence": 1.0};
            } else if( this._mBOM.slice(0,2) == "\xFF\xFE" ) {
                // FF FE  UTF-16, little endian BOM
                this.result = {"encoding": "UTF-16LE", "confidence": 1.0};
            } else if( this._mBOM.slice(0,2) == "\xFE\xFF" ) {
                // FE FF  UTF-16, big endian BOM
                this.result = {"encoding": "UTF-16BE", "confidence": 1.0};
            }

            // If we got to 4 chars without being able to detect a BOM we
            // stop trying.
            if( this._mBOM.length > 3 ) {
                this._mGotData = true;
            }
        }

        if( this.result.encoding && (this.result.confidence > 0.0) ) {
            this.done = true;
            return;
        }

        if( this._mInputState == _state.pureAscii ) {
            if( this._highBitDetector.test(aBuf) ) {
                this._mInputState = _state.highbyte;
            } else if( this._escDetector.test(this._mLastChar + aBuf) ) {
                this._mInputState = _state.escAscii;
            }
        }

        this._mLastChar = aBuf.slice(-1);

        if( this._mInputState == _state.escAscii ) {
            // if( !this._mEscCharsetProber ) {
            //     this._mEscCharsetProber = new EscCharSetProber();
            // }
            // if( this._mEscCharsetProber.feed(aBuf) == constants.foundIt ) {
            //     this.result = {
            //         "encoding": this._mEscCharsetProber.getCharsetName(),
            //         "confidence": this._mEscCharsetProber.getConfidence()
            //     };
            //     this.done = true;
            // }
        } else if( this._mInputState == _state.highbyte ) {
            if( this._mCharsetProbers.length == 0 ) {
                this._mCharsetProbers = [
                    new MBCSGroupProber(),
                    // new SBCSGroupProber(),
                    new Latin1Prober()
                ];
            }
            for( var i = 0, prober; prober = this._mCharsetProbers[i]; i++ ) {
                if( prober.feed(aBuf) == constants.foundIt ) {
                    this.result = {
                        "encoding": prober.getCharsetName(),
                        "confidence": prober.getConfidence()
                    };
                    this.done = true;
                    break;
                }
            }
        }
    }

    this.close = function() {
        if( this.done ) return;
        if( this._mBOM.length === 0 ) {
            logger.log("no data received!\n");
            return;
        }
        this.done = true;

        if( this._mInputState == _state.pureAscii ) {
            logger.log("pure ascii")
            this.result = {"encoding": "ascii", "confidence": 1.0};
            return this.result;
        }

        if( this._mInputState == _state.highbyte ) {
            var proberConfidence = null;
            var maxProberConfidence = 0.0;
            var maxProber = null;
            for( var i = 0, prober; prober = this._mCharsetProbers[i]; i++ ) {
                if( !prober ) continue;
                proberConfidence = prober.getConfidence();
                if( proberConfidence > maxProberConfidence ) {
                    maxProberConfidence = proberConfidence;
                    maxProber = prober;
                }
                logger.log(prober.getCharsetName() + " confidence " + prober.getConfidence());
            }
            if( maxProber && maxProberConfidence > options.minimumThreshold ) {
                this.result = {
                    "encoding": maxProber.getCharsetName(),
                    "confidence": maxProber.getConfidence()
                };
                return this.result;
            }
        }

        if( logger.enabled ) {
            logger.log("no probers hit minimum threshhold\n");
            for( var i = 0, prober; prober = this._mCharsetProbers[i]; i++ ) {
                if( !prober ) continue;
                logger.log(prober.getCharsetName() + " confidence = " +
                    prober.getConfidence() + "\n");
            }
        }
    }

    init();
}

module.exports = UniversalDetector;

},{"./constants":5,"./latin1prober":7,"./logger":8,"./mbcsgroupprober":9}],12:[function(require,module,exports){
/*
 * The Original Code is Mozilla Universal charset detector code.
 *
 * The Initial Developer of the Original Code is
 * Netscape Communications Corporation.
 * Portions created by the Initial Developer are Copyright (C) 2001
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   António Afonso (antonio.afonso gmail.com) - port to JavaScript
 *   Mark Pilgrim - port to Python
 *   Shy Shalom - original C code
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301  USA
 */

var CodingStateMachine = require('./codingstatemachine');
var CharSetProber = require('./charsetprober');
var constants = require('./constants');
var UTF8SMModel = require('./mbcssm/utf8');

function UTF8Prober() {
    CharSetProber.apply(this);

    var ONE_CHAR_PROB = 0.5;
    var self = this;

    function init() {
        self._mCodingSM = new CodingStateMachine(UTF8SMModel);
        self.reset();
    }

    this.reset = function() {
        UTF8Prober.prototype.reset.apply(this);
        this._mCodingSM.reset();
        this._mNumOfMBChar = 0;
    }

    this.getCharsetName = function() {
        return "UTF-8";
    }

    this.feed = function(aBuf) {
        for( var i = 0, c; i < aBuf.length; i++ ) {
            c = aBuf[i];
            var codingState = this._mCodingSM.nextState(c);
            if( codingState == constants.error ) {
                this._mState = constants.notMe;
                break;
            } else if( codingState == constants.itsMe ) {
                this._mState = constants.foundIt;
                break;
            } else if( codingState == constants.start ) {
                if( this._mCodingSM.getCurrentCharLen() >= 2 ) {
                    this._mNumOfMBChar++;
                }
            }
        }

        if( this.getState() == constants.detecting ) {
            if( this.getConfidence() > constants.SHORTCUT_THRESHOLD ) {
                this._mState = constants.foundIt;
            }
        }

        return this.getState();
    }

    this.getConfidence = function() {
        var unlike = 0.99;
        if( this._mNumOfMBChar < 6 ) {
            for( var i = 0; i < this._mNumOfMBChar; i++ ) {
                unlike *= ONE_CHAR_PROB;
            }
            return 1 - unlike;
        } else {
            return unlike;
        }
    }

    init();
}
UTF8Prober.prototype = new CharSetProber();

module.exports = UTF8Prober;

},{"./charsetprober":3,"./codingstatemachine":4,"./constants":5,"./mbcssm/utf8":10}]},{},[1])(1)
});