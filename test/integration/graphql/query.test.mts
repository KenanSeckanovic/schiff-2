/* eslint-disable vitest/no-conditional-expect */
/* eslint-disable vitest/no-conditional-in-test */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
// Copyright (C) 2025 - present Juergen Zimmermann, Hochschule Karlsruhe
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

import { type GraphQLRequest } from '@apollo/server';
import { HttpStatus } from '@nestjs/common';
import { beforeAll, describe, expect, test } from 'vitest';
import { type Prisma } from '../../../src/generated/prisma/client.js';
import {
    ACCEPT,
    APPLICATION_JSON,
    CONTENT_TYPE,
    GRAPHQL_RESPONSE_JSON,
    POST,
    graphqlURL,
} from '../constants.mjs';

export type SchiffDTO = Omit<
    Prisma.SchiffGetPayload<{
        include: {
            offizier: true;
        };
    }>,
    'aktualisiert' | 'erzeugt'
>;

type SchiffSuccessType = { data: { schiff: SchiffDTO }; errors?: undefined };
type SchiffeSuccessType = {
    data: { schiffe: SchiffDTO[] };
    errors?: undefined;
};

export type ErrorsType = {
    message: string;
    path: string[];
    extensions: { code: string };
}[];
type SchiffErrorsType = { data: { schiff: null }; errors: ErrorsType };

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const ids = [100, 200];

const namen = ['Pearl', 'Revenge', 'Rusalka'];

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
describe('GraphQL Queries', () => {
    let headers: Headers;

    beforeAll(() => {
        headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(ACCEPT, GRAPHQL_RESPONSE_JSON);
    });

    test.concurrent.each(ids)('Schiff zu ID %i', async (id) => {
        // given
        const query: GraphQLRequest = {
            query: `
                {
                    schiff(id: "${id}") {
                        version
                        name
                        laenge
                        offizier {
                            name
                        }
                    }
                }
            `,
        };

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(query),
            headers,
        });

        // then
        const { status } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(response.headers.get(CONTENT_TYPE)).toMatch(
            /application\/graphql-response\+json/iu,
        );

        const { data, errors } = (await response.json()) as SchiffSuccessType;

        expect(errors).toBeUndefined();
        expect(data).toBeDefined();

        const { schiff } = data;

        const offizierName = schiff.offizier?.name;
        if (offizierName != null) {
            expect(offizierName).toMatch(/^\w/u);
        }

        expect(schiff.version).toBeGreaterThan(-1);
        expect(schiff.id).toBeUndefined();
    });

    test.concurrent('Schiff zu nicht-vorhandener ID', async () => {
        // given
        const id = '999999';
        const query: GraphQLRequest = {
            query: `
                {
                    schiff(id: "${id}") {
                        offizier {
                            name
                        }
                    }
                }
            `,
        };

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(query),
            headers,
        });

        // then
        const { status } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(response.headers.get(CONTENT_TYPE)).toMatch(
            /application\/graphql-response\+json/iu,
        );

        const { data, errors } = (await response.json()) as SchiffErrorsType;

        expect(data.schiff).toBeNull();
        expect(errors).toHaveLength(1);

        const [error] = errors;
        const { message, path, extensions } = error!;

        expect(message).toBe(`Es gibt kein Schiff mit der ID ${id}.`);
        expect(path).toBeDefined();
        expect(path![0]).toBe('schiff');
        expect(extensions).toBeDefined();
        expect(extensions!.code).toBe('BAD_USER_INPUT');
    });

    test.concurrent.each(namen)('Schiff zu Name', async (nameExpected) => {
        // given
        const query: GraphQLRequest = {
            query: `
                    {
                        schiffe(suchparameter: {
                            name: "${nameExpected}"
                        }) {
                            name
                            offizier {
                                name
                            }
                        }
                    }
                `,
        };

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(query),
            headers,
        });

        // then
        const { status } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(response.headers.get(CONTENT_TYPE)).toMatch(
            /application\/graphql-response\+json/iu,
        );

        const { data, errors } = (await response.json()) as SchiffeSuccessType;

        expect(errors).toBeUndefined();
        expect(data).toBeDefined();

        const { schiffe } = data;

        expect(schiffe).not.toHaveLength(0);
        expect(schiffe).toHaveLength(1);

        const [schiff] = schiffe;
        const { offizier, name } = schiff!;

        expect(name).toBe(nameExpected);

        if (offizier != null) {
            expect(offizier.name).toBeDefined();
        }
    });
});

/* eslint-enable @typescript-eslint/no-non-null-assertion */
