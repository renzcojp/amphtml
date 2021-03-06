/**
 * Copyright 2015 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  isDevChannel, isDevChannelVersionDoNotUse_,
  isExperimentOn, toggleExperiment,
  resetExperimentToggles_} from '../../src/experiments';
import * as sinon from 'sinon';


describe('isExperimentOn', () => {
  let win;
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    win = {document: {}, AMP_CONFIG: {}};
  });

  afterEach(() => {
    resetExperimentToggles_();
    sandbox.restore();
  });

  function expectExperiment(cookieString, experimentId) {
    win.document.cookie = cookieString;
    return expect(isExperimentOn(win, experimentId));
  }

  describe('with only cookie flag', () => {

    it('should return "off" with no cookies, malformed or empty', () => {
      expectExperiment(null, 'e1').to.be.false;
      expectExperiment(undefined, 'e1').to.be.false;
      expectExperiment('', 'e1').to.be.false;
      expectExperiment('AMP_EXP', 'e1').to.be.false;
      expectExperiment('AMP_EXP=', 'e1').to.be.false;
    });

    it('should return "off" when value is not in the list', () => {
      expectExperiment('AMP_EXP=e1a,e2', 'e1').to.be.false;
    });

    it('should return "on" when value is in the list', () => {
      expectExperiment('AMP_EXP=e1', 'e1').to.be.true;
      expectExperiment('AMP_EXP=e1,e2', 'e1').to.be.true;
      expectExperiment('AMP_EXP=e2,e1', 'e1').to.be.true;
      expectExperiment('AMP_EXP=e2 , e1', 'e1').to.be.true;
    });
  });

  describe('with global flag', () => {

    it('should prioritize cookie flag', () => {
      win.AMP_CONFIG['e1'] = true;
      expectExperiment('AMP_EXP=e1', 'e1').to.be.true;
    });

    it('should fall back to global flag', () => {
      const cookie = 'AMP_EXP=e2,e4';
      win.AMP_CONFIG['e1'] = true;
      win.AMP_CONFIG['e2'] = 1;
      win.AMP_CONFIG['e3'] = 0;
      win.AMP_CONFIG['e4'] = false;
      expectExperiment(cookie, 'e1').to.be.true;
      expectExperiment(cookie, 'e2').to.be.true;
      expectExperiment(cookie, 'e3').to.be.false;
      expectExperiment(cookie, 'e4').to.be.true;
    });

    it('should return "off" when not in cookie flag or global flag', () => {
      expectExperiment('AMP_EXP=', 'e1').to.be.false;
    });

    it('should calc if experiment should be "on"', () => {
      win.AMP_CONFIG['e1'] = 1;
      expectExperiment('', 'e1').to.be.true;
      resetExperimentToggles_();

      win.AMP_CONFIG['e2'] = 0;
      expectExperiment('', 'e2').to.be.false;

      sandbox.stub(Math, 'random').returns(0.5);
      win.AMP_CONFIG['e3'] = 0.3;
      expectExperiment('', 'e3').to.be.false;

      win.AMP_CONFIG['e4'] = 0.6;
      expectExperiment('', 'e4').to.be.true;

      win.AMP_CONFIG['e5'] = 0.5;
      expectExperiment('', 'e5').to.be.false;

      win.AMP_CONFIG['e6'] = 0.51;
      expectExperiment('', 'e6').to.be.true;
    });

    it('should cache calc value', () => {
      const randomStub = sandbox.stub(Math, 'random');
      randomStub.onFirstCall().returns(0.4);
      randomStub.onSecondCall().returns(0.4);
      randomStub.returns(0.9);
      win.AMP_CONFIG['e1'] = 0.5;
      win.AMP_CONFIG['e2'] = 0.1;

      expect(Math.random()).to.equal(0.4);
      expectExperiment('', 'e1').to.be.true;

      // it should continue to be true even though random() is not
      // less than the experiment value which is 0.5
      expect(Math.random()).to.equal(0.9);
      expectExperiment('', 'e1').to.be.true;

      expect(Math.random()).to.equal(0.9);
      expectExperiment('', 'e2').to.be.false;
    });
  });
});


describe('toggleExperiment', () => {

  let sandbox;
  let clock;
  let expTime;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    clock = sandbox.useFakeTimers();
    clock.tick(1);
    expTime = new Date(1 + 180 * 24 * 60 * 60 * 1000).toUTCString();
  });

  afterEach(() => {
    sandbox.restore();
  });

  function expectToggle(cookiesString, experimentId, opt_on) {
    const doc = {
      cookie: cookiesString,
    };
    const on = toggleExperiment({document: doc}, experimentId, opt_on);
    const parts = doc.cookie.split(/\s*;\s*/g);
    if (parts.length > 1) {
      expect(parts[1]).to.equal('path=/');
      expect(parts[2]).to.equal('expires=' + expTime);
    }
    return expect(`${on}; ${decodeURIComponent(parts[0])}`);
  }

  it('should toggle to "on" with no cookies, malformed or empty', () => {
    expectToggle(null, 'e1').to.equal('true; AMP_EXP=e1');
    expectToggle(undefined, 'e1').to.equal('true; AMP_EXP=e1');
    expectToggle('', 'e1').to.equal('true; AMP_EXP=e1');
    expectToggle('AMP_EXP', 'e1').to.equal('true; AMP_EXP=e1');
    expectToggle('AMP_EXP=', 'e1').to.equal('true; AMP_EXP=e1');
  });

  it('should toggle "on" when value is not in the list', () => {
    expectToggle('AMP_EXP=e1a,e2', 'e1').to.equal('true; AMP_EXP=e1a,e2,e1');
  });

  it('should toggle "off" when value is in the list', () => {
    expectToggle('AMP_EXP=e1', 'e1').to.equal('false; AMP_EXP=');
    expectToggle('AMP_EXP=e1,e2', 'e1').to.equal('false; AMP_EXP=e2');
    expectToggle('AMP_EXP=e2,e1', 'e1').to.equal('false; AMP_EXP=e2');
  });

  it('should set "on" when requested', () => {
    expectToggle('AMP_EXP=e2', 'e1', true).to.equal('true; AMP_EXP=e2,e1');
    expectToggle('AMP_EXP=e1', 'e1', true).to.equal('true; AMP_EXP=e1');
  });

  it('should set "off" when requested', () => {
    expectToggle('AMP_EXP=e2,e1', 'e1', false).to.equal('false; AMP_EXP=e2');
    expectToggle('AMP_EXP=e1', 'e1', false).to.equal('false; AMP_EXP=');
  });
});


describe('isDevChannel', () => {

  function expectDevChannel(cookiesString) {
    return expect(isDevChannel({
      document: {
        cookie: cookiesString,
      },
    }));
  }

  it('should return value based on cookie', () => {
    expectDevChannel('AMP_EXP=other').to.be.false;
    resetExperimentToggles_();
    expectDevChannel('AMP_EXP=dev-channel').to.be.true;
  });

  it('should return value based on binary version', () => {
    const win = {
      AMP_CONFIG: {
        canary: false,
      },
    };
    expect(isDevChannelVersionDoNotUse_(win)).to.be.false;
    win.AMP_CONFIG.canary = true;
    expect(isDevChannelVersionDoNotUse_(win)).to.be.true;
  });
});
