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

import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
    PrismaClient,
    type Schiff,
} from '../../src/generated/prisma/client.js';
import { type Pageable } from '../../src/schiff/service/pageable.js';
import { PrismaService } from '../../src/schiff/service/prisma-service.js';
import { SchiffService } from '../../src/schiff/service/schiff-service.js';
import { type Suchparameter } from '../../src/schiff/service/suchparameter.js';
import { WhereBuilder } from '../../src/schiff/service/where-builder.js';

describe('SchiffService find', () => {
    let service: SchiffService;
    let prismaServiceMock: PrismaService;

    beforeEach(() => {
        const findManyMock = vi.fn<PrismaClient['schiff']['findMany']>();
        const countMock = vi.fn<PrismaClient['schiff']['count']>();
        prismaServiceMock = {
            client: {
                schiff: {
                    findMany: findManyMock,
                    count: countMock,
                },
            },
        } as any; // cast since we don’t need the full PrismaService here

        const whereBuilder = new WhereBuilder();

        service = new SchiffService(prismaServiceMock, whereBuilder);
    });

    test('offizier vorhanden', async () => {
        // given
        const name = 'Name';
        const suchparameter: Suchparameter = { name };
        const pageable: Pageable = { number: 1, size: 5 };
        const schiffMock: Schiff = {
            id: 1,
            version: 0,
            name: 'Hallo',
            laenge: 140 as any,
            erzeugt: new Date(),
            aktualisiert: new Date(),
            offizier: {
                id: 11,
                name: 'Kirkland',
                alter: 35,
                schiffId: 1,
            },
            kisten: [],
        } as any;
        (prismaServiceMock.client.schiff.findMany as any).mockResolvedValueOnce(
            [schiffMock],
        );
        (prismaServiceMock.client.schiff.count as any).mockResolvedValueOnce(1);

        // when
        const result = await service.find(suchparameter, pageable);

        // then
        const { content } = result;

        expect(content).toHaveLength(1);
        expect(content[0]).toStrictEqual(schiffMock);
    });

    test('name nicht vorhanden', async () => {
        // given
        const name = 'Name';
        const suchparameter: Suchparameter = { name };
        const pageable: Pageable = { number: 1, size: 5 };
        (prismaServiceMock.client.schiff.findMany as any).mockResolvedValue([]);

        // when / then
        await expect(service.find(suchparameter, pageable)).rejects.toThrow(
            /^Keine Schiffe gefunden/,
        );
    });
});
