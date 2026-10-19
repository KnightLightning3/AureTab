import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { engines, searchURL } from '../js/search/engines.js';
import { imageSearchAdapters } from '../js/search/imageSearch.js';
import { validatePrefs, parseBackup } from '../js/io/schema.js';
import { DEFAULT_PREFS, createDefaultData } from '../js/storage/DataStore.js';

test('Baidu encodes searches, survives backup preferences and has a bundled icon', () => {
 assert.equal(searchURL('baidu',' 中文 & a? '),'https://www.baidu.com/s?wd=%E4%B8%AD%E6%96%87%20%26%20a%3F');
 assert.equal(validatePrefs({...DEFAULT_PREFS,engine:'baidu'}).engine,'baidu');
 assert.equal(parseBackup({version:1,data:createDefaultData(),prefs:{...DEFAULT_PREFS,engine:'baidu'}}).prefs.engine,'baidu');
 assert.ok(existsSync(new URL('../'+engines.baidu.icon,import.meta.url)));
});
test('Baidu camera uses the official desktop identification page without enabling an unverified upload', () => {
 assert.equal(engines.baidu.images,'https://graph.baidu.com/pcpage/index?tpl_from=pc');
 assert.equal(imageSearchAdapters.baidu.verified,false);
});
