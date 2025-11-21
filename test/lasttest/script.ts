// Copyright (C) 2024 - present Juergen Zimmermann, Hochschule Karlsruhe
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

import http from 'k6/http';
// @ts-expect-error https://github.com/grafana/k6-jslib-testing
import { expect } from 'https://jslib.k6.io/k6-testing/0.5.0/index.js';
import { sleep } from 'k6';
import { type Options } from 'k6/options';
// @ts-expect-error k6 verwendet esbuild fuer "Type Stripping": import mit "".js" funktioniert nicht
import { SchiffDTO } from '../../src/schiff/controller/schiff-dto.ts';
// @ts-expect-error k6 verwendet esbuild fuer "Type Stripping": import mit "".js" funktioniert nicht
import { generateName } from './name_generate.ts';

const baseUrl = 'https://localhost:3000';
const restUrl = `${baseUrl}/rest`;
const graphqlUrl = `${baseUrl}/graphql`;
const tokenUrl = `${baseUrl}/auth/token`;
const dbPopulateUrl = `${baseUrl}/dev/db_populate`;

const ids = [100, 200, 300];
const namen = ['Pearl', 'Revenge', 'Rusalka'];
const neuesSchiff: SchiffDTO = {
    name: 'Test',
    laenge: 70,
    offizier: {
        name: 'Namek6',
        alter: 40,
    },
    kisten: [
        {
            laenge: 4,
            hoehe: 2,
            breite: 2,
        },
    ],
};

const tlsDir = '../../src/config/resources/tls';
const cert = open(`${tlsDir}/certificate.crt`);
const key = open(`${tlsDir}/key.pem`);

// https://grafana.com/docs/k6/latest/using-k6/test-lifecycle
export function setup() {
    const tokenHeaders: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
    };

    const body = 'username=admin&password=p';
    const tokenResponse = http.post<'text'>(tokenUrl, body, {
        headers: tokenHeaders,
    });
    let token: string;
    if (tokenResponse.status === 200) {
        token = JSON.parse(tokenResponse.body).access_token;
        console.log(`token=${token}`);
    } else {
        throw new Error(
            `setup fuer adminToken: status=${tokenResponse.status}, body=${tokenResponse.body}`,
        );
    }

    const headers = { Authorization: `Bearer ${token}` };
    const res = http.post(dbPopulateUrl, undefined, { headers });
    if (res.status === 200) {
        console.log('DB neu geladen');
    } else {
        throw new Error(
            `setup fuer db_populate: status=${res.status}, body=${res.body}`,
        );
    }
}

const rampUpDuration = '5s';
const steadyDuration = '22s';
const rampDownDuration = '3s';

export const options: Options = {
    batchPerHost: 50,
    // httpDebug: 'headers',

    scenarios: {
        get_id: {
            exec: 'getById',
            executor: 'ramping-vus', // "Ramp up" zu Beginn und "Ramp down" am Ende des Testintervalls
            stages: [
                { target: 2, duration: rampUpDuration }, // "traffic ramp-up": schrittweise von 0 auf 2 User in 5 Sek
                { target: 2, duration: steadyDuration }, // 2 User fuer den eigentlichen Lasttest
                { target: 0, duration: rampDownDuration }, // "ramp-down": schrittweise auf 0 User
            ],
        },
        get_id_not_modified: {
            exec: 'getByIdNotModified',
            executor: 'ramping-vus', // "Ramp up" zu Beginn und "Ramp down" am Ende des Testintervalls
            stages: [
                { target: 5, duration: rampUpDuration },
                { target: 5, duration: steadyDuration },
                { target: 0, duration: rampDownDuration },
            ],
        },
        get_name: {
            exec: 'getByName',
            executor: 'ramping-vus',
            stages: [
                { target: 10, duration: rampUpDuration },
                { target: 10, duration: '22s' },
                { target: 0, duration: rampDownDuration },
            ],
        },
        get_laenge: {
            exec: 'getByLaenge',
            executor: 'ramping-vus',
            stages: [
                { target: 15, duration: rampUpDuration },
                { target: 15, duration: '22s' },
                { target: 0, duration: rampDownDuration },
            ],
        },
        post_schiff: {
            exec: 'postSchiff',
            executor: 'ramping-vus',
            stages: [
                { target: 3, duration: rampUpDuration },
                { target: 3, duration: '22s' },
                { target: 0, duration: rampDownDuration },
            ],
        },
        query_schiff: {
            exec: 'querySchiff',
            executor: 'ramping-vus',
            stages: [
                { target: 3, duration: rampUpDuration },
                { target: 3, duration: '22s' },
                { target: 0, duration: rampDownDuration },
            ],
        },
        query_schiffe: {
            exec: 'querySchiffe',
            executor: 'ramping-vus',
            stages: [
                { target: 5, duration: rampUpDuration },
                { target: 5, duration: '22s' },
                { target: 0, duration: rampDownDuration },
            ],
        },
        query_schiffe_nicht_vorhanden: {
            exec: 'querySchiffeNichtVorhanden',
            executor: 'ramping-vus',
            stages: [
                { target: 2, duration: rampUpDuration },
                { target: 2, duration: '22s' },
                { target: 0, duration: rampDownDuration },
            ],
        },
    },

    // https://grafana.com/docs/k6/latest/using-k6/protocols/ssl-tls/ssl-tls-client-certificates
    tlsAuth: [
        {
            cert,
            key,
        },
    ],
    tlsVersion: http.TLS_1_3, // DevSkim: ignore DS440000
    insecureSkipTLSVerify: true,
};

// HTTP-Requests mit Ueberpruefungen

// GET /rest/<id>
export function getById() {
    // https://stackoverflow.com/questions/4550505/getting-a-random-value-from-a-javascript-array
    // alternativ: https://jslib.k6.io und https://grafana.com/docs/k6/latest/javascript-api/jslib/utils
    const id = ids[Math.floor(Math.random() * ids.length)]; // zwischen 0 und 1
    const response = http.get(`${restUrl}/${id}`);

    const { status, headers } = response;
    // expect ab k6 1.2.0
    // https://github.com/grafana/k6/releases/tag/v1.2.0
    // https://github.com/grafana/k6/issues/4067
    expect(status).toBe(200);
    expect(headers['Content-Type']).toContain('application/json');
    sleep(1); // Denkzeit simulieren
}

// GET /rest/<id> mit If-None-Match
export function getByIdNotModified() {
    // https://stackoverflow.com/questions/4550505/getting-a-random-value-from-a-javascript-array
    const id = ids[Math.floor(Math.random() * ids.length)]; // zwischen 0 und 1
    const headers: Record<string, string> = {
        'If-None-Match': '"0"',
    };
    const response = http.get(`${restUrl}/${id}`, { headers });

    expect(response.status).toBe(304);
    sleep(1);
}

// GET /rest?name=<value>
export function getByName() {
    const name = namen[Math.floor(Math.random() * namen.length)];
    const response = http.get(`${restUrl}?name=${name}`);

    const { status, headers } = response;
    expect(status).toBe(200);
    expect(headers['Content-Type']).toContain('application/json');
    sleep(1);
}

// POST /rest
export function postSchiff() {
    const schiff = { ...neuesSchiff };
    schiff.name = generateName();

    const tokenHeaders: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
    };
    const body = 'username=admin&password=p';
    const tokenResponse = http.post<'text'>(tokenUrl, body, {
        headers: tokenHeaders,
    });
    expect(tokenResponse.status).toBe(200);
    const token = JSON.parse(tokenResponse.body).access_token;

    const requestHeaders = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
    const response = http.post(restUrl, JSON.stringify(schiff), {
        headers: requestHeaders,
    });

    const { status, headers } = response;
    expect(status).toBe(201);
    expect(headers['Location']).toContain(restUrl);
    sleep(1);
}

// POST /graphql query "Schiff"
export function querySchiff() {
    const id = ids[Math.floor(Math.random() * ids.length)];
    const body = {
        query: `
            {
                schiff(id: "${id}") {
                    name
                    laenge
                    offizier {
                        name
                    }
                }
            }
        `,
    };
    const requestHeaders = { 'Content-Type': 'application/json' };

    const response = http.post(graphqlUrl, JSON.stringify(body), {
        headers: requestHeaders,
    });

    const { status, headers } = response;
    expect(status).toBe(200);
    expect(headers['Content-Type']).toContain('application/json');
    sleep(1);
}

// GET /rest?laenge=<value>
export function getByLaenge() {
    // hier nimmst du irgendeine Laenge, die es in deinen Testdaten gibt
    const laenge = 70;
    const response = http.get(`${restUrl}?laenge=${laenge}`);

    const { status, headers } = response;
    expect(status).toBe(200);
    expect(headers['Content-Type']).toContain('application/json');
    sleep(1);
}

// POST /graphql query "schiffe" mit vorhandenem Namen
export function querySchiffe() {
    const name = namen[Math.floor(Math.random() * namen.length)];
    const body = {
        query: `
            {
                schiffe(suchparameter: {
                    name: "${name}"
                }) {
                    name
                    laenge
                    offizier {
                        name
                    }
                }
            }
        `,
    };
    const requestHeaders = { 'Content-Type': 'application/json' };

    const response = http.post(graphqlUrl, JSON.stringify(body), {
        headers: requestHeaders,
    });

    const { status, headers } = response;
    expect(status).toBe(200);
    expect(headers['Content-Type']).toContain('application/json');
    sleep(1);
}

// POST /graphql query "schiffe" mit NICHT vorhandenem Namen
export function querySchiffeNichtVorhanden() {
    const name = 'NICHT_VORHANDEN_K6';
    const body = {
        query: `
            {
                schiffe(suchparameter: {
                    name: "${name}"
                }) {
                    name
                }
            }
        `,
    };
    const requestHeaders = { 'Content-Type': 'application/json' };

    const response = http.post(graphqlUrl, JSON.stringify(body), {
        headers: requestHeaders,
    });

    // Server sollte sauber mit 200 + leerer Liste antworten
    expect(response.status).toBe(200);
    sleep(1);
}
