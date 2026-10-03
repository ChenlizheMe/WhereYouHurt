import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assessSymptoms} from '../src/clinicalEngine.js';

const knowledge=JSON.parse(fs.readFileSync(new URL('../data/knowledge.json',import.meta.url),'utf8'));

test('dental symptoms rank a concrete dental differential',()=>{
 const result=assessSymptoms(knowledge,{parts:['Upper first molar tooth.r'],layer:'skeleton',feelings:['冷热敏感','夜间痛'],signs:['牙龋洞']});
 assert.equal(result.items[0].id,'dental-caries');
 assert.match(result.items[0].summary,/龋|牙本质/);
});

test('abdominal quadrant filters the opposite visceral side',()=>{
 const result=assessSymptoms(knowledge,{parts:['Rectus abdominis muscle.r'],layer:'muscle',feelings:['绞痛'],signs:['发热'],location:'rlq',severity:7});
 assert.ok(result.items.some(item=>item.id==='appendicitis-pattern'));
 assert.ok(!result.items.some(item=>item.id==='diverticular-left-abdominal'));
 assert.ok(result.urgent.length>0);
});

test('severe abdominal red flags stay visible above the cards',()=>{
 const result=assessSymptoms(knowledge,{parts:['Rectus abdominis muscle.l'],layer:'muscle',feelings:['钝痛'],signs:['呕血'],location:'epigastric',severity:9});
 assert.ok(result.urgent.length>0);
});
