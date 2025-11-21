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
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { MailService } from '../../src/mail/mail-service.js';
import { PrismaService } from '../../src/schiff/service/prisma-service.js';
import { SchiffService } from '../../src/schiff/service/schiff-service.js';
import {
    type SchiffCreate,
    SchiffWriteService,
} from '../../src/schiff/service/schiff-write-service.js';
import { WhereBuilder } from '../../src/schiff/service/where-builder.js';

describe('SchiffWriteService create', () => {
    let service: SchiffWriteService;
    let prismaServiceMock: PrismaService;
    let readService: SchiffService;
    let mailService: MailService;
    let schiffCreateMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        schiffCreateMock = vi.fn<any>();
        const transactionMock = vi
            .fn<any>()
            .mockImplementation(async (cb: any) => {
                // Mock-Objekt für die Transaktion
                const tx = {
                    schiff: { create: schiffCreateMock },
                };
                // Callback mit dem Mock-Objekt fuer die Transaktion aufrufen
                await cb(tx);
            });

        const countMock = vi.fn<PrismaClient['schiff']['count']>();

        prismaServiceMock = {
            client: {
                $transaction: transactionMock,
                schiff: {
                    count: countMock,
                },
            } as unknown,
        } as PrismaService;

        const whereBuilder = new WhereBuilder();

        readService = new SchiffService(prismaServiceMock, whereBuilder);

        mailService = new MailService();

        service = new SchiffWriteService(
            prismaServiceMock,
            readService,
            mailService,
        );
    });

    test('Neues Schiff', async () => {
        // given
        const idMock = 1;
        const schiff: SchiffCreate = {
            name: 'Taranus',
            laenge: 100,
            offizier: {
                create: {
                    name: 'Manfred',
                    alter: 60,
                },
            },
        };
        const schiffMockTemp: any = { ...schiff };
        schiffMockTemp.id = idMock;
        schiffMockTemp.offizier.create.id = 11;
        schiffMockTemp.offizier.create.schiffId = idMock;
        schiffCreateMock.mockResolvedValue(schiffMockTemp);

        // when
        const id = await service.create(schiff);

        // then
        expect(id).toBe(idMock);
    });
});
