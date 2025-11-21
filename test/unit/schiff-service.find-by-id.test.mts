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
import { PrismaService } from '../../src/schiff/service/prisma-service.js';
import { SchiffService } from '../../src/schiff/service/schiff-service.js';
import { WhereBuilder } from '../../src/schiff/service/where-builder.js';

describe('SchiffService findById', () => {
    let service: SchiffService;
    let prismaServiceMock: PrismaService;

    beforeEach(() => {
        const findUniqueMock = vi.fn<PrismaClient['schiff']['findUnique']>();
        prismaServiceMock = {
            client: {
                schiff: {
                    findUnique: findUniqueMock,
                },
            },
        } as any; // cast since we don’t need the full PrismaService here

        const whereBuilder = new WhereBuilder();

        service = new SchiffService(prismaServiceMock, whereBuilder);
    });

    test('id vorhanden', async () => {
        // given
        const id = 1;
        const schiffMock: Schiff = {
            id,
            version: 0,
            name: 'Jason',
            laenge: 100 as any,
            erzeugt: new Date(),
            aktualisiert: new Date(),
            offizier: {
                id: 11,
                name: 'Thomas',
                alter: 60,
                schiffId: id,
            },
            kisten: [],
        } as any;
        (
            prismaServiceMock.client.schiff.findUnique as any
        ).mockResolvedValueOnce(schiffMock);

        // when
        const schiff = await service.findById({ id });

        // then
        expect(schiff).toStrictEqual(schiffMock);
    });

    test('id nicht vorhanden', async () => {
        // given
        const id = 999;
        (prismaServiceMock.client.schiff.findUnique as any).mockResolvedValue(
            null,
        );

        // when / then
        await expect(service.findById({ id })).rejects.toThrow(
            `Es gibt kein Schiff mit der ID ${id}.`,
        );
    });
});
