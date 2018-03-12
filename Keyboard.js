function Keyboard () {
  const rx_keys = /<(C-)?(\w+)>|./g;

  this.mappings  = {};
  this.mode      = 'normal';

  this.mapFunction = (mode, keys, f, canCount = false) => {
    const ks = this.parseKeys (keys);

    if (ks.length == 0)
      console.error('Cannot map empty key sequence!');

    if (!(mode in this.mappings))
      this.mappings[mode] = {};

    this.mappings[mode][keys] =
      { keys: ks, f: f, canCount: canCount };
  }

  this.isUpperCase = chr => {
    return chr === chr.toUpperCase()
        && !chr.match(/\d/)
        && chr.match(/\w/);
  }

  this.runFunction = (o, cnt) => {
    cnt = parseInt(cnt);

    if (isNaN(cnt)) cnt = 1;
    if (o.canCount == true) return o.f(cnt);

    let ret;
    for (let i = 0; i < cnt; i++) ret = o.f();
    return ret;
  }

  this.parseKeys = str => {
    let rs = [], m;

    while (m = rx_keys.exec(str)) {
      let s = [], k = '';

      if (m[2]) {
        if (m[1]) s.push('C');
        k = m[2];
      } else {
        k = m[0];
      }

      if (this.isUpperCase(k))
        s.push('S');

      s.sort();
      rs.push ({ key: k.toLowerCase(), mod: s });
    }

    return rs;
  };

  this.compareKeys = (a, b) => {
    if (a.key !== b.key) return false;
    if (a.mod.length !== b.mod.length) return false;
    for (let i = 0; i<a.mod.length; i++)
      if (a.mod[i] !== b.mod[i]) return false;
    return true;
  }

  this.execKey = (k, cnt='') => {
    const maps = this.mappings[this.mode];
    let ms     = [];

    if (k.mod.length == 0 && k.key.match(/\d/)) {
      cnt += k.key;
      return k => this.execKey (k, cnt);
    }

    for (const _o in maps) {
      const o  = maps[_o];
      const _k = o.keys[0];
      if (!this.compareKeys(k, _k)) continue;
      let ks = [];
      for (let i = 1; i < o.keys.length; i++)
        ks.push(o.keys[i]);

      if (ks.length == 0) {
        this.runFunction(o, cnt);
        return;
      }

      ms.push({keys: ks, f: o.f, canCount: o.canCount});
    }

    if (ms.length === 0) return false;

    const rest = (ms) => {
      return k => {
        for (let i = ms.length-1; i>=0; i--) {
          const m = ms[i];

          if (!this.compareKeys(k, m.keys[0])) {
            ms.splice(i,1);
            continue
          }

          if (m.keys.length == 1) {
            this.runFunction(m, cnt);
            return;
          }

          m.keys.splice(0,1);
        }

        if (ms.length == 0) return false;
        return rest (ms);
      }
    };

    return rest (ms);
  };

  this.onkeydown = e => {
    if (e.key == 'Shift' || e.key == 'Control' || e.key == 'Alt') return;
    console.log(e)

    const m = [];
    if (e.ctrlKey)  m.push('C')
    if ( (e.shiftKey && e.key.length > 1)
      || this.isUpperCase(e.key)
       ) m.push('S');

    m.sort()

    const key =
      { key: e.key.toLowerCase()
      , mod: m
      };

    let wasFun = true;
    if (!(this.accFun instanceof Function)) {
      this.accFun = this.execKey;
      wasFun      = false;
    }

    this.accFun = this.accFun (key);

    if (wasFun && this.accFun === false)
      this.accFun = this.execKey(key);
  }

  this.onkeyup = e => { }

  // execKeys is like onkeydown, but you have to handle
  // the state yourself
  this._execKeys = (f, n, ks) => {
    let _r = f;

    while (ks.length > 0 && _r instanceof Function) {
      _r = _r(ks[0]);
      ks = ks.slice(1);
    }

    if (ks.length === 0) return _r;
    return this._execKeys(n, n, ks);
  }

  this.execKeys = ks => this._execKeys(this.execKey, this.execKey, ks);

  // --------------------------

  this.nmap = (a, b) => {
    const _a = a
        , _b = this.parseKeys(b)
        , _m = 'normal'
        ;

    const f = () =>
      this.accFun = this._execKeys
        ( this.accFun || this.execKey
        , this.execKey
        , _b );

    // TOOD: We don't know that it can count
    this.mapFunction(_m, _a, f, true);
  }

}
