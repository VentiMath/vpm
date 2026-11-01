'use strict';
// Upstream reference results; JS literals preserve negative zero.
module.exports = {
  plain: {
    x: 116,
    y: -21,
    placement: 'right-end',
    strategy: 'absolute',
    middlewareData: {}
  },
  popover: {
    x: 120,
    y: 0,
    placement: 'right-end',
    strategy: 'absolute',
    middlewareData: {
      offset: {
        x: 4,
        y: 0,
        placement: 'right-end'
      },
      flip: {},
      shift: {
        x: 0,
        y: 21,
        enabled: {
          y: true,
          x: false
        }
      }
    }
  },
  tooltip: {
    x: 89,
    y: 24,
    placement: 'bottom-end',
    strategy: 'absolute',
    middlewareData: {
      offset: {
        x: -0,
        y: 4,
        placement: 'bottom-end'
      },
      flip: {
        index: 5,
        overflows: [
          {
            placement: 'right-end',
            overflows: [
              -67,
              25,
              -216
            ]
          },
          {
            placement: 'right-start',
            overflows: [
              -67,
              -208,
              17
            ]
          },
          {
            placement: 'left-end',
            overflows: [
              48,
              25,
              -216
            ]
          },
          {
            placement: 'left-start',
            overflows: [
              48,
              -208,
              17
            ]
          },
          {
            placement: 'top-end',
            overflows: [
              62,
              -98,
              -85
            ]
          }
        ]
      },
      shift: {
        x: 0,
        y: 0,
        enabled: {
          x: true,
          y: false
        }
      }
    }
  },
  dropdown: {
    x: 120,
    y: 4,
    placement: 'right-start',
    strategy: 'absolute',
    middlewareData: {
      offset: {
        x: 4,
        y: 0,
        placement: 'right-start'
      },
      flip: {
        index: 3,
        overflows: [
          {
            placement: 'right-end',
            overflows: [
              -71,
              21,
              -220
            ]
          },
          {
            placement: 'right-start',
            overflows: [
              -71,
              -212,
              13
            ]
          },
          {
            placement: 'left-end',
            overflows: [
              44,
              21,
              -220
            ]
          }
        ]
      },
      shift: {
        x: 0,
        y: 17,
        enabled: {
          y: true,
          x: false
        }
      }
    }
  },
  arrow: {
    x: 121,
    y: 0,
    placement: 'right-start',
    strategy: 'absolute',
    middlewareData: {
      offset: {
        x: 5,
        y: 2.7,
        placement: 'right-start'
      },
      flip: {
        index: 3,
        overflows: [
          {
            placement: 'right-end',
            overflows: [
              -70,
              23.7,
              -222.7
            ]
          },
          {
            placement: 'right-start',
            overflows: [
              -70,
              -209.3,
              10.3
            ]
          },
          {
            placement: 'left-end',
            overflows: [
              45,
              23.7,
              -222.7
            ]
          }
        ]
      },
      shift: {
        x: 0,
        y: 10.3,
        enabled: {
          y: true,
          x: true
        }
      },
      arrow: {
        y: 10,
        centerOffset: -1
      }
    }
  },
  auto: {
    x: 38,
    y: 20,
    placement: 'bottom',
    strategy: 'absolute',
    middlewareData: {
      autoPlacement: {
        index: 4,
        overflows: [
          {
            placement: 'top',
            overflows: [
              54,
              -38,
              -153
            ]
          },
          {
            placement: 'right',
            overflows: [
              -75,
              17,
              -216
            ]
          },
          {
            placement: 'bottom',
            overflows: [
              -179,
              -38,
              -153
            ]
          },
          {
            placement: 'left',
            overflows: [
              40,
              17,
              -216
            ]
          }
        ]
      },
      shift: {
        x: 0,
        y: 0,
        enabled: {
          x: true,
          y: true
        }
      }
    }
  },
  inline: {
    x: 118,
    y: -21,
    placement: 'right-end',
    strategy: 'absolute',
    middlewareData: {
      inline: {},
      offset: {
        x: 2,
        y: 0,
        placement: 'right-end'
      }
    }
  },
  size: {
    x: 116,
    y: 0,
    placement: 'right-end',
    strategy: 'absolute',
    middlewareData: {
      shift: {
        x: 0,
        y: 21,
        enabled: {
          y: true,
          x: false
        }
      },
      size: {}
    }
  }
};
