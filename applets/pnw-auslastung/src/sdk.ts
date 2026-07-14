export type LocalDate = {
    /** e.g. 2026-03-30 */
    $date: string;
};

export type LocalDateTime = {
    /** e.g. 2026-03-30T13:55:21 */
    $datetime: string;
};

export type Decimal = {
    /** e.g. 12.3456 */
    $decimal: string;
};

export type Time = {
    /** e.g. 13:55:21 */
    $time: string;
};

export type Duration = {
    /** ISO 8601 duration e.g. PT7H59M */
    $duration: string;
};

export interface BaseFilter<T> {
    $eq?: T | null;
    $neq?: T | null;
    $in?: (T | null)[];
    $notIn?: (T | null)[];
    $lt?: T;
    $lte?: T;
    $gt?: T;
    $gte?: T;
    $range?: [T | null, T | null];
}

export type Many2OneFieldFilter<T> = T & {
    $or?: Many2OneFieldFilter<T>[];
    $and?: Many2OneFieldFilter<T>[];
    $not?: Many2OneFieldFilter<T>;
    $eq?: string;
    $neq?: string;
    $in?: string[];
    $notIn?: string[];
    $childOf?: string[];
    $parentOf?: string[];
    $parentChildOf?: string[];
}

export interface One2ManyFieldFilter<T> {
    $exists?: T;
    $notExists?: T;
}

export interface Many2ManyFieldFilter<T> {
    $exists?: T;
    $notExists?: T;
}

export interface TextFieldFilter extends BaseFilter<string> {
    $contains?: string;
    $notContains?: string;
    $startsWith?: string;
    $endsWith?: string;
}

export interface UuidFieldFilter {
    $eq?: string;
    $neq?: string;
    $in?: string[];
    $notIn?: string[];
}

export type UsersGraph = {
    id?: 1;
    writeDate?: 1;
    /** Breitengrad */
    addressLatitude?: 1;
    /** Längengrad */
    addressLongitude?: 1;
    /** Anrede */
    gender?: {
        /** Name */
        name?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            /** Name */
            name?: TextFieldFilter | string;
        }
    };
    /** Titel */
    titleName?: 1;
    /** Vorname */
    firstName?: 1;
    /** Name */
    name?: 1;
    /** Geburtsdatum */
    dayOfBirth?: 1;
    /** Personalnummer */
    employmentId?: 1;
    /** Straße */
    street?: 1;
    /** Addresszusatz */
    streetAddition?: 1;
    /** Postleitzahl */
    zip?: 1;
    /** Stadt */
    city?: 1;
    /** Wochenstunden */
    weeklyHours?: 1;
    /** Verträge */
    contracts?: {
        /** Vertrag */
        contract?: {
            id?: 1;
            /** Name */
            name?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }
        };
        /** Einrichtung */
        orgUnit?: {
            id?: 1;
            /** Name */
            name?: 1;
            /** Unternehmen */
            company?: {
                id?: 1;
                /** Name */
                name?: 1;
                /** Amount of records to fetch. */
                $limit?: number;
                /** Amounts of records to be skipped. */
                $offset?: number;
                /** A filter to apply to the to be fetched records. */
                $filter?: {
                    id?: UuidFieldFilter | string;
                    /** Name */
                    name?: TextFieldFilter | string;
                }
            };
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
                /** Unternehmen */
                company?: Many2OneFieldFilter<{
                    id?: UuidFieldFilter | string;
                    /** Name */
                    name?: TextFieldFilter | string;
                }>;
            }
        };
        /** Gültig ab */
        validFrom?: 1;
        /** Gültig bis */
        validUntil?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            /** Vertrag */
            contract?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }>;
            /** Einrichtung */
            orgUnit?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
                /** Unternehmen */
                company?: Many2OneFieldFilter<{
                    id?: UuidFieldFilter | string;
                    /** Name */
                    name?: TextFieldFilter | string;
                }>;
            }>;
            /** Gültig ab */
            validFrom?: BaseFilter<LocalDate> | LocalDate;
            /** Gültig bis */
            validUntil?: BaseFilter<LocalDate> | LocalDate | null;
        }
    };
    /** Ziel-Stunden */
    targetHours?: {
        /** Sollstundenmodell */
        model?: {
            /** Name */
            name?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                /** Name */
                name?: TextFieldFilter | string;
            }
        };
        /** Monatsstunden */
        monthlyHours?: 1;
        /** Wochenstunden */
        weeklyHours?: 1;
        /** Gültig ab */
        validFrom?: 1;
        /** Gültig bis */
        validUntil?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            /** Sollstundenmodell */
            model?: Many2OneFieldFilter<{
                /** Name */
                name?: TextFieldFilter | string;
            }>;
            /** Monatsstunden */
            monthlyHours?: BaseFilter<Duration> | Duration | null;
            /** Wochenstunden */
            weeklyHours?: BaseFilter<Duration> | Duration | null;
            /** Gültig ab */
            validFrom?: BaseFilter<LocalDate> | LocalDate;
            /** Gültig bis */
            validUntil?: BaseFilter<LocalDate> | LocalDate | null;
        }
    };
    /** Qualifikationen */
    workQualifications?: {
        /** Qualifikation */
        qualification?: {
            /** Name */
            name?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                /** Name */
                name?: TextFieldFilter | string;
            }
        };
        /** Gültig ab */
        validFrom?: 1;
        /** Gültig bis */
        validUntil?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            /** Qualifikation */
            qualification?: Many2OneFieldFilter<{
                /** Name */
                name?: TextFieldFilter | string;
            }>;
            /** Gültig ab */
            validFrom?: BaseFilter<LocalDate> | LocalDate;
            /** Gültig bis */
            validUntil?: BaseFilter<LocalDate> | LocalDate | null;
        }
    };
    /** Kostenstellen */
    workCostCenters?: {
        /** Gültig ab */
        validFrom?: 1;
        /** Gültig bis */
        validUntil?: 1;
        /** Stammkostenstelle */
        mainCostCenter?: {
            /** Name */
            name?: 1;
            /** Kostenstelle */
            number?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                /** Name */
                name?: TextFieldFilter | string;
                /** Kostenstelle */
                number?: TextFieldFilter | string | null;
            }
        };
        /** Kostenstellen */
        costCenters?: {
            /** Anteil */
            share?: 1;
            /** Kostenstelle */
            costCenter?: {
                /** Name */
                name?: 1;
                /** Kostenstelle */
                number?: 1;
                /** Amount of records to fetch. */
                $limit?: number;
                /** Amounts of records to be skipped. */
                $offset?: number;
                /** A filter to apply to the to be fetched records. */
                $filter?: {
                    /** Name */
                    name?: TextFieldFilter | string;
                    /** Kostenstelle */
                    number?: TextFieldFilter | string | null;
                }
            };
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                /** Anteil */
                share?: BaseFilter<Decimal> | Decimal | null;
                /** Kostenstelle */
                costCenter?: Many2OneFieldFilter<{
                    /** Name */
                    name?: TextFieldFilter | string;
                    /** Kostenstelle */
                    number?: TextFieldFilter | string | null;
                }>;
            }
        };
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            /** Gültig ab */
            validFrom?: BaseFilter<LocalDate> | LocalDate;
            /** Gültig bis */
            validUntil?: BaseFilter<LocalDate> | LocalDate | null;
            /** Stammkostenstelle */
            mainCostCenter?: Many2OneFieldFilter<{
                /** Name */
                name?: TextFieldFilter | string;
                /** Kostenstelle */
                number?: TextFieldFilter | string | null;
            }> | null;
            /** Kostenstellen */
            costCenters?: One2ManyFieldFilter<{
                /** Anteil */
                share?: BaseFilter<Decimal> | Decimal | null;
                /** Kostenstelle */
                costCenter?: Many2OneFieldFilter<{
                    /** Name */
                    name?: TextFieldFilter | string;
                    /** Kostenstelle */
                    number?: TextFieldFilter | string | null;
                }>;
            }>;
        }
    };
    /** Bereiche */
    orgUnits?: {
        id?: 1;
        /** Name */
        name?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Name */
            name?: TextFieldFilter | string;
        }
    };
    udf?: {
        Erhöhung?: 1;
        Führungszeugnis?: 1;
        Führerschein?: 1;
        Datenschutz?: 1;
        Verfassungstreue?: 1;
        'Weiter/Fortbildung'?: 1;
        'BEH Ausbildung'?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
    };
    /** Archiviert am */
    deletedAt?: 1;
    /** Amount of records to fetch. */
    $limit?: number;
    /** Amounts of records to be skipped. */
    $offset?: number;
    /**
     * Fetch records newer than previously fetched records.
     * It is safe to store and reuse this value to check for updates.
     */
    $cursor?: string
    /** A filter to apply to the to be fetched records. */
    $filter?: {
        id?: UuidFieldFilter | string;
        writeDate?: BaseFilter<LocalDateTime> | LocalDateTime;
        /** Breitengrad */
        addressLatitude?: BaseFilter<number> | number | null;
        /** Längengrad */
        addressLongitude?: BaseFilter<number> | number | null;
        /** Anrede */
        gender?: Many2OneFieldFilter<{
            /** Name */
            name?: TextFieldFilter | string;
        }>;
        /** Titel */
        titleName?: TextFieldFilter | string | null;
        /** Vorname */
        firstName?: TextFieldFilter | string | null;
        /** Name */
        name?: TextFieldFilter | string;
        /** Geburtsdatum */
        dayOfBirth?: BaseFilter<LocalDate> | LocalDate | null;
        /** Personalnummer */
        employmentId?: TextFieldFilter | string | null;
        /** Straße */
        street?: TextFieldFilter | string | null;
        /** Addresszusatz */
        streetAddition?: TextFieldFilter | string | null;
        /** Postleitzahl */
        zip?: TextFieldFilter | string | null;
        /** Stadt */
        city?: TextFieldFilter | string | null;
        /** Wochenstunden */
        weeklyHours?: BaseFilter<Decimal> | Decimal | null;
        /** Verträge */
        contracts?: One2ManyFieldFilter<{
            /** Vertrag */
            contract?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }>;
            /** Einrichtung */
            orgUnit?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
                /** Unternehmen */
                company?: Many2OneFieldFilter<{
                    id?: UuidFieldFilter | string;
                    /** Name */
                    name?: TextFieldFilter | string;
                }>;
            }>;
            /** Gültig ab */
            validFrom?: BaseFilter<LocalDate> | LocalDate;
            /** Gültig bis */
            validUntil?: BaseFilter<LocalDate> | LocalDate | null;
        }>;
        /** Ziel-Stunden */
        targetHours?: One2ManyFieldFilter<{
            /** Sollstundenmodell */
            model?: Many2OneFieldFilter<{
                /** Name */
                name?: TextFieldFilter | string;
            }>;
            /** Monatsstunden */
            monthlyHours?: BaseFilter<Duration> | Duration | null;
            /** Wochenstunden */
            weeklyHours?: BaseFilter<Duration> | Duration | null;
            /** Gültig ab */
            validFrom?: BaseFilter<LocalDate> | LocalDate;
            /** Gültig bis */
            validUntil?: BaseFilter<LocalDate> | LocalDate | null;
        }>;
        /** Qualifikationen */
        workQualifications?: One2ManyFieldFilter<{
            /** Qualifikation */
            qualification?: Many2OneFieldFilter<{
                /** Name */
                name?: TextFieldFilter | string;
            }>;
            /** Gültig ab */
            validFrom?: BaseFilter<LocalDate> | LocalDate;
            /** Gültig bis */
            validUntil?: BaseFilter<LocalDate> | LocalDate | null;
        }>;
        /** Kostenstellen */
        workCostCenters?: One2ManyFieldFilter<{
            /** Gültig ab */
            validFrom?: BaseFilter<LocalDate> | LocalDate;
            /** Gültig bis */
            validUntil?: BaseFilter<LocalDate> | LocalDate | null;
            /** Stammkostenstelle */
            mainCostCenter?: Many2OneFieldFilter<{
                /** Name */
                name?: TextFieldFilter | string;
                /** Kostenstelle */
                number?: TextFieldFilter | string | null;
            }> | null;
            /** Kostenstellen */
            costCenters?: One2ManyFieldFilter<{
                /** Anteil */
                share?: BaseFilter<Decimal> | Decimal | null;
                /** Kostenstelle */
                costCenter?: Many2OneFieldFilter<{
                    /** Name */
                    name?: TextFieldFilter | string;
                    /** Kostenstelle */
                    number?: TextFieldFilter | string | null;
                }>;
            }>;
        }>;
        /** Bereiche */
        orgUnits?: Many2ManyFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Name */
            name?: TextFieldFilter | string;
        }>;
        udf?: {
            Erhöhung?: BaseFilter<LocalDate> | LocalDate | null;
            Führungszeugnis?: BaseFilter<LocalDate> | LocalDate | null;
            Führerschein?: BaseFilter<LocalDate> | LocalDate | null;
            Datenschutz?: BaseFilter<LocalDate> | LocalDate | null;
            Verfassungstreue?: BaseFilter<LocalDate> | LocalDate | null;
            'Weiter/Fortbildung'?: TextFieldFilter | string | null;
            'BEH Ausbildung'?: BaseFilter<LocalDate> | LocalDate | null;
        };
        /** Archiviert am */
        deletedAt?: BaseFilter<LocalDateTime> | LocalDateTime | null;
    }
};

export type UsersAbsencesGraph = {
    id?: 1;
    writeDate?: 1;
    createDate?: 1;
    createUser?: {
        id?: 1;
        recName?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            recName?: TextFieldFilter | string;
        }
    };
    writeUser?: {
        id?: 1;
        recName?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            recName?: TextFieldFilter | string;
        }
    };
    /** Mitarbeiter */
    user?: {
        id?: 1;
        /** Voller Name */
        fullName?: 1;
        recName?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Voller Name */
            fullName?: TextFieldFilter | string;
            recName?: TextFieldFilter | string;
        }
    };
    /** Beginn */
    begin?: 1;
    /** Ende */
    end?: 1;
    /** AU-Art */
    attestationType?: {
        id?: 1;
        /** Name */
        name?: 1;
        /** Interner Name */
        internalName?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Name */
            name?: TextFieldFilter | string;
            /** Interner Name */
            internalName?: TextFieldFilter | string;
        }
    };
    /** Festgestellt am */
    attestationDate?: 1;
    /** AU seit */
    attestationSince?: 1;
    /** Voraussichtlich bis */
    attestationUntil?: 1;
    /** Status */
    status?: 1;
    /** Art */
    type?: 1;
    /** Unterart */
    subType?: {
        /** Name */
        name?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            /** Name */
            name?: TextFieldFilter | string;
        }
    };
    /** Tage */
    totalDays?: 1;
    /** Kalendertage */
    calendarDays?: 1;
    dirtyForAdmin?: 1;
    dirtyForUser?: 1;
    /** Nachname Kind */
    childName?: 1;
    /** Vorname Kind */
    childFirstName?: 1;
    /** Geburtstag Kind */
    childDayOfBirth?: 1;
    vacationEntitlement?: {
        /** Bemerkung */
        description?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            /** Bemerkung */
            description?: TextFieldFilter | string;
        }
    };
    /** eAU */
    absenceResponse?: {
        id?: 1;
        /** Name */
        name?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Name */
            name?: TextFieldFilter | string;
        }
    };
    /** Zuständigkeit */
    workflowStage?: {
        id?: 1;
        /** Name */
        name?: 1;
        /** Sequenz */
        sequence?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Name */
            name?: TextFieldFilter | string;
            /** Sequenz */
            sequence?: BaseFilter<number> | number;
        }
    };
    /** Status */
    absenceStatus?: {
        id?: 1;
        /** Name */
        name?: 1;
        /** Interner Name */
        internalName?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Name */
            name?: TextFieldFilter | string;
            /** Interner Name */
            internalName?: TextFieldFilter | string;
        }
    };
    /** Art */
    absenceType?: {
        id?: 1;
        /** Name */
        recName?: 1;
        /** Name */
        name?: 1;
        /** Interner Name */
        internalName?: 1;
        /** Farbe */
        color?: 1;
        /** Art */
        type?: {
            id?: 1;
            /** Name */
            name?: 1;
            /** Interner Name */
            internalName?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
                /** Interner Name */
                internalName?: TextFieldFilter | string;
            }
        };
        /** Kontoart */
        accountType?: {
            id?: 1;
            /** Name */
            name?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }
        };
        /** Unterarten */
        subTypes?: {
            id?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                id?: UuidFieldFilter | string;
            }
        };
        /** Zeitwert */
        timeSource?: {
            id?: 1;
            /** Name */
            name?: 1;
            /** Interner Name */
            internalName?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
                /** Interner Name */
                internalName?: TextFieldFilter | string;
            }
        };
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Name */
            recName?: TextFieldFilter | string;
            /** Name */
            name?: TextFieldFilter | string;
            /** Interner Name */
            internalName?: TextFieldFilter | string | null;
            /** Farbe */
            color?: TextFieldFilter | string;
            /** Art */
            type?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
                /** Interner Name */
                internalName?: TextFieldFilter | string;
            }>;
            /** Kontoart */
            accountType?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }>;
            /** Unterarten */
            subTypes?: Many2ManyFieldFilter<{
                id?: UuidFieldFilter | string;
            }>;
            /** Zeitwert */
            timeSource?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
                /** Interner Name */
                internalName?: TextFieldFilter | string;
            }>;
        }
    };
    /** Unterart */
    absenceSubType?: {
        id?: 1;
        /** Name */
        name?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Name */
            name?: TextFieldFilter | string;
        }
    };
    /** Logs */
    logs?: {
        id?: 1;
        createDate?: 1;
        createUser?: {
            /** Voller Name */
            fullName?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                /** Voller Name */
                fullName?: TextFieldFilter | string;
            }
        };
        /** Text */
        text?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            createDate?: BaseFilter<LocalDateTime> | LocalDateTime;
            createUser?: Many2OneFieldFilter<{
                /** Voller Name */
                fullName?: TextFieldFilter | string;
            }>;
            /** Text */
            text?: TextFieldFilter | string;
        }
    };
    /** Autom. Verteilung */
    automaticDistribution?: 1;
    /** Tage anpassen */
    customDistribution?: 1;
    accountLines?: {
        id?: 1;
        /** Datum */
        date?: 1;
        /** Stunden */
        hours?: 1;
        /** Anzahl */
        quantity?: 1;
        /** Gegenkonto */
        account?: {
            /** Art */
            type?: {
                id?: 1;
                /** Name */
                name?: 1;
                /** Art */
                type?: {
                    /** Interner Name */
                    internalName?: 1;
                    /** Amount of records to fetch. */
                    $limit?: number;
                    /** Amounts of records to be skipped. */
                    $offset?: number;
                    /** A filter to apply to the to be fetched records. */
                    $filter?: {
                        /** Interner Name */
                        internalName?: TextFieldFilter | string;
                    }
                };
                /** Amount of records to fetch. */
                $limit?: number;
                /** Amounts of records to be skipped. */
                $offset?: number;
                /** A filter to apply to the to be fetched records. */
                $filter?: {
                    id?: UuidFieldFilter | string;
                    /** Name */
                    name?: TextFieldFilter | string;
                    /** Art */
                    type?: Many2OneFieldFilter<{
                        /** Interner Name */
                        internalName?: TextFieldFilter | string;
                    }>;
                }
            };
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                /** Art */
                type?: Many2OneFieldFilter<{
                    id?: UuidFieldFilter | string;
                    /** Name */
                    name?: TextFieldFilter | string;
                    /** Art */
                    type?: Many2OneFieldFilter<{
                        /** Interner Name */
                        internalName?: TextFieldFilter | string;
                    }>;
                }>;
            }
        };
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Datum */
            date?: BaseFilter<LocalDate> | LocalDate;
            /** Stunden */
            hours?: BaseFilter<Duration> | Duration;
            /** Anzahl */
            quantity?: BaseFilter<Decimal> | Decimal;
            /** Gegenkonto */
            account?: Many2OneFieldFilter<{
                /** Art */
                type?: Many2OneFieldFilter<{
                    id?: UuidFieldFilter | string;
                    /** Name */
                    name?: TextFieldFilter | string;
                    /** Art */
                    type?: Many2OneFieldFilter<{
                        /** Interner Name */
                        internalName?: TextFieldFilter | string;
                    }>;
                }>;
            }>;
        }
    };
    /** Amount of records to fetch. */
    $limit?: number;
    /** Amounts of records to be skipped. */
    $offset?: number;
    /**
     * Fetch records newer than previously fetched records.
     * It is safe to store and reuse this value to check for updates.
     */
    $cursor?: string
    /** A filter to apply to the to be fetched records. */
    $filter?: {
        id?: UuidFieldFilter | string;
        writeDate?: BaseFilter<LocalDateTime> | LocalDateTime;
        createDate?: BaseFilter<LocalDateTime> | LocalDateTime;
        createUser?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            recName?: TextFieldFilter | string;
        }>;
        writeUser?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            recName?: TextFieldFilter | string;
        }>;
        /** Mitarbeiter */
        user?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Voller Name */
            fullName?: TextFieldFilter | string;
            recName?: TextFieldFilter | string;
        }>;
        /** Beginn */
        begin?: BaseFilter<LocalDate> | LocalDate;
        /** Ende */
        end?: BaseFilter<LocalDate> | LocalDate;
        /** AU-Art */
        attestationType?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Name */
            name?: TextFieldFilter | string;
            /** Interner Name */
            internalName?: TextFieldFilter | string;
        }> | null;
        /** Festgestellt am */
        attestationDate?: BaseFilter<LocalDate> | LocalDate | null;
        /** AU seit */
        attestationSince?: BaseFilter<LocalDate> | LocalDate | null;
        /** Voraussichtlich bis */
        attestationUntil?: BaseFilter<LocalDate> | LocalDate | null;
        /** Status */
        status?: TextFieldFilter | string;
        /** Art */
        type?: TextFieldFilter | string | null;
        /** Unterart */
        subType?: Many2OneFieldFilter<{
            /** Name */
            name?: TextFieldFilter | string;
        }> | null;
        /** Tage */
        totalDays?: BaseFilter<Decimal> | Decimal;
        /** Kalendertage */
        calendarDays?: BaseFilter<number> | number | null;
        dirtyForAdmin?: boolean | null;
        dirtyForUser?: boolean | null;
        /** Nachname Kind */
        childName?: TextFieldFilter | string | null;
        /** Vorname Kind */
        childFirstName?: TextFieldFilter | string | null;
        /** Geburtstag Kind */
        childDayOfBirth?: BaseFilter<LocalDate> | LocalDate | null;
        vacationEntitlement?: Many2OneFieldFilter<{
            /** Bemerkung */
            description?: TextFieldFilter | string;
        }> | null;
        /** eAU */
        absenceResponse?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Name */
            name?: TextFieldFilter | string;
        }> | null;
        /** Zuständigkeit */
        workflowStage?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Name */
            name?: TextFieldFilter | string;
            /** Sequenz */
            sequence?: BaseFilter<number> | number;
        }>;
        /** Status */
        absenceStatus?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Name */
            name?: TextFieldFilter | string;
            /** Interner Name */
            internalName?: TextFieldFilter | string;
        }>;
        /** Art */
        absenceType?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Name */
            recName?: TextFieldFilter | string;
            /** Name */
            name?: TextFieldFilter | string;
            /** Interner Name */
            internalName?: TextFieldFilter | string | null;
            /** Farbe */
            color?: TextFieldFilter | string;
            /** Art */
            type?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
                /** Interner Name */
                internalName?: TextFieldFilter | string;
            }>;
            /** Kontoart */
            accountType?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }>;
            /** Unterarten */
            subTypes?: Many2ManyFieldFilter<{
                id?: UuidFieldFilter | string;
            }>;
            /** Zeitwert */
            timeSource?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
                /** Interner Name */
                internalName?: TextFieldFilter | string;
            }>;
        }>;
        /** Unterart */
        absenceSubType?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Name */
            name?: TextFieldFilter | string;
        }> | null;
        /** Logs */
        logs?: One2ManyFieldFilter<{
            id?: UuidFieldFilter | string;
            createDate?: BaseFilter<LocalDateTime> | LocalDateTime;
            createUser?: Many2OneFieldFilter<{
                /** Voller Name */
                fullName?: TextFieldFilter | string;
            }>;
            /** Text */
            text?: TextFieldFilter | string;
        }>;
        /** Autom. Verteilung */
        automaticDistribution?: boolean;
        /** Tage anpassen */
        customDistribution?: boolean;
        accountLines?: One2ManyFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Datum */
            date?: BaseFilter<LocalDate> | LocalDate;
            /** Stunden */
            hours?: BaseFilter<Duration> | Duration;
            /** Anzahl */
            quantity?: BaseFilter<Decimal> | Decimal;
            /** Gegenkonto */
            account?: Many2OneFieldFilter<{
                /** Art */
                type?: Many2OneFieldFilter<{
                    id?: UuidFieldFilter | string;
                    /** Name */
                    name?: TextFieldFilter | string;
                    /** Art */
                    type?: Many2OneFieldFilter<{
                        /** Interner Name */
                        internalName?: TextFieldFilter | string;
                    }>;
                }>;
            }>;
        }>;
    }
};

export type ContactsGraph = {
    id?: 1;
    /** Debitorenkonto */
    accountNumber?: 1;
    /** Leitwege-ID */
    ediRoutingId?: 1;
    /** IK-Nummer */
    ikNumber?: 1;
    /** Breitengrad */
    addressLatitude?: 1;
    /** Längengrad */
    addressLongitude?: 1;
    /** Avatarfarbe */
    avatarColor?: 1;
    /** Avatar */
    avatarImage?: 1;
    /** Stadt */
    city?: 1;
    /** Klient */
    client?: {
        id?: 1;
        /** Voller Name */
        fullName?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Voller Name */
            fullName?: TextFieldFilter | string;
        }
    };
    /** Bemerkung */
    comment?: 1;
    /** Unternehmen */
    company?: {
        id?: 1;
        /** Name */
        name?: 1;
        /** Name */
        recName?: 1;
        /** Kontaktart */
        contactType?: {
            id?: 1;
            /** Name */
            name?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }
        };
        /** Postleitzahl */
        zip?: 1;
        /** Stadt */
        city?: 1;
        /** Straße */
        street?: 1;
        /** Adresszusatz */
        streetAddition?: 1;
        /** Kurzname */
        shortName?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Name */
            name?: TextFieldFilter | string;
            /** Name */
            recName?: TextFieldFilter | string;
            /** Kontaktart */
            contactType?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }>;
            /** Postleitzahl */
            zip?: TextFieldFilter | string | null;
            /** Stadt */
            city?: TextFieldFilter | string | null;
            /** Straße */
            street?: TextFieldFilter | string | null;
            /** Adresszusatz */
            streetAddition?: TextFieldFilter | string | null;
            /** Kurzname */
            shortName?: TextFieldFilter | string | null;
        }
    };
    /** Kontaktmöglichkeiten */
    contactMechanisms?: {
        id?: 1;
        /** Bemerkung */
        comment?: 1;
        /** Art */
        type?: 1;
        /** Wert */
        value?: 1;
        /** Kontaktart */
        mechanismType?: {
            id?: 1;
            /** Name */
            name?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }
        };
        /** Rechnungsversand */
        invoice?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Bemerkung */
            comment?: TextFieldFilter | string | null;
            /** Art */
            type?: TextFieldFilter | string;
            /** Wert */
            value?: TextFieldFilter | string;
            /** Kontaktart */
            mechanismType?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }>;
            /** Rechnungsversand */
            invoice?: boolean;
        }
    };
    /** Anrede */
    contactTitle?: {
        id?: 1;
        /** Name */
        name?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Name */
            name?: TextFieldFilter | string;
        }
    };
    /** Kontaktart */
    contactType?: {
        id?: 1;
        /** Name */
        name?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Name */
            name?: TextFieldFilter | string;
        }
    };
    /** Klientenkontakt */
    clientContact?: {
        /** Klient */
        client?: {
            id?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                id?: UuidFieldFilter | string;
            }
        };
        /** Beziehung */
        kind?: {
            id?: 1;
            /** Name */
            name?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }
        };
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            /** Klient */
            client?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
            }>;
            /** Beziehung */
            kind?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }> | null;
        }
    };
    /** Archiviert am */
    deletedAt?: 1;
    /** Email */
    email?: 1;
    /** Fax */
    fax?: 1;
    /** Vorname */
    firstName?: 1;
    /** Kontaktart */
    kind?: 1;
    /** Mobil */
    mobilePhone?: 1;
    /** Name */
    name?: 1;
    /** Telefon */
    phone?: 1;
    /** Name */
    recName?: 1;
    /** Institution */
    locationName?: 1;
    /** Referenz */
    reference?: 1;
    /** Kurzname */
    shortName?: 1;
    /** Straße */
    street?: 1;
    /** Adresszusatz */
    streetAddition?: 1;
    /** Unterart */
    subType?: {
        id?: 1;
        /** Name */
        name?: 1;
        /** Archiviert am */
        deletedAt?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Name */
            name?: TextFieldFilter | string;
            /** Archiviert am */
            deletedAt?: BaseFilter<LocalDateTime> | LocalDateTime | null;
        }
    };
    /** Titel */
    title?: 1;
    /** Art */
    type?: 1;
    /** Mitarbeiter */
    user?: {
        id?: 1;
        /** Bereiche */
        orgUnits?: {
            id?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                id?: UuidFieldFilter | string;
            }
        };
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Bereiche */
            orgUnits?: Many2ManyFieldFilter<{
                id?: UuidFieldFilter | string;
            }>;
        }
    };
    /** Postleitzahl */
    zip?: 1;
    /** DTA Produktivbetrieb */
    dtaProduction?: 1;
    doBulkInvoice?: 1;
    createDate?: 1;
    writeDate?: 1;
    createUser?: {
        id?: 1;
        /** Voller Name */
        fullName?: 1;
        recName?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Voller Name */
            fullName?: TextFieldFilter | string;
            recName?: TextFieldFilter | string;
        }
    };
    writeUser?: {
        id?: 1;
        /** Voller Name */
        fullName?: 1;
        recName?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Voller Name */
            fullName?: TextFieldFilter | string;
            recName?: TextFieldFilter | string;
        }
    };
    /** Amount of records to fetch. */
    $limit?: number;
    /** Amounts of records to be skipped. */
    $offset?: number;
    /**
     * Fetch records newer than previously fetched records.
     * It is safe to store and reuse this value to check for updates.
     */
    $cursor?: string
    /** A filter to apply to the to be fetched records. */
    $filter?: {
        id?: UuidFieldFilter | string;
        /** Debitorenkonto */
        accountNumber?: TextFieldFilter | string | null;
        /** Leitwege-ID */
        ediRoutingId?: TextFieldFilter | string;
        /** IK-Nummer */
        ikNumber?: TextFieldFilter | string | null;
        /** Breitengrad */
        addressLatitude?: BaseFilter<number> | number | null;
        /** Längengrad */
        addressLongitude?: BaseFilter<number> | number | null;
        /** Avatarfarbe */
        avatarColor?: TextFieldFilter | string | null;
        /** Avatar */
        avatarImage?: TextFieldFilter | string | null;
        /** Stadt */
        city?: TextFieldFilter | string | null;
        /** Klient */
        client?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Voller Name */
            fullName?: TextFieldFilter | string;
        }> | null;
        /** Bemerkung */
        comment?: TextFieldFilter | string | null;
        /** Unternehmen */
        company?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Name */
            name?: TextFieldFilter | string;
            /** Name */
            recName?: TextFieldFilter | string;
            /** Kontaktart */
            contactType?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }>;
            /** Postleitzahl */
            zip?: TextFieldFilter | string | null;
            /** Stadt */
            city?: TextFieldFilter | string | null;
            /** Straße */
            street?: TextFieldFilter | string | null;
            /** Adresszusatz */
            streetAddition?: TextFieldFilter | string | null;
            /** Kurzname */
            shortName?: TextFieldFilter | string | null;
        }> | null;
        /** Kontaktmöglichkeiten */
        contactMechanisms?: One2ManyFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Bemerkung */
            comment?: TextFieldFilter | string | null;
            /** Art */
            type?: TextFieldFilter | string;
            /** Wert */
            value?: TextFieldFilter | string;
            /** Kontaktart */
            mechanismType?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }>;
            /** Rechnungsversand */
            invoice?: boolean;
        }>;
        /** Anrede */
        contactTitle?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Name */
            name?: TextFieldFilter | string;
        }> | null;
        /** Kontaktart */
        contactType?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Name */
            name?: TextFieldFilter | string;
        }>;
        /** Klientenkontakt */
        clientContact?: One2ManyFieldFilter<{
            /** Klient */
            client?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
            }>;
            /** Beziehung */
            kind?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }> | null;
        }>;
        /** Archiviert am */
        deletedAt?: BaseFilter<LocalDateTime> | LocalDateTime | null;
        /** Email */
        email?: TextFieldFilter | string | null;
        /** Fax */
        fax?: TextFieldFilter | string | null;
        /** Vorname */
        firstName?: TextFieldFilter | string | null;
        /** Kontaktart */
        kind?: TextFieldFilter | string | null;
        /** Mobil */
        mobilePhone?: TextFieldFilter | string | null;
        /** Name */
        name?: TextFieldFilter | string;
        /** Telefon */
        phone?: TextFieldFilter | string | null;
        /** Name */
        recName?: TextFieldFilter | string;
        /** Institution */
        locationName?: TextFieldFilter | string;
        /** Referenz */
        reference?: TextFieldFilter | string | null;
        /** Kurzname */
        shortName?: TextFieldFilter | string | null;
        /** Straße */
        street?: TextFieldFilter | string | null;
        /** Adresszusatz */
        streetAddition?: TextFieldFilter | string | null;
        /** Unterart */
        subType?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Name */
            name?: TextFieldFilter | string;
            /** Archiviert am */
            deletedAt?: BaseFilter<LocalDateTime> | LocalDateTime | null;
        }> | null;
        /** Titel */
        title?: TextFieldFilter | string | null;
        /** Art */
        type?: TextFieldFilter | string;
        /** Mitarbeiter */
        user?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Bereiche */
            orgUnits?: Many2ManyFieldFilter<{
                id?: UuidFieldFilter | string;
            }>;
        }> | null;
        /** Postleitzahl */
        zip?: TextFieldFilter | string | null;
        /** DTA Produktivbetrieb */
        dtaProduction?: boolean;
        doBulkInvoice?: boolean;
        createDate?: BaseFilter<LocalDateTime> | LocalDateTime;
        writeDate?: BaseFilter<LocalDateTime> | LocalDateTime;
        createUser?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Voller Name */
            fullName?: TextFieldFilter | string;
            recName?: TextFieldFilter | string;
        }>;
        writeUser?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Voller Name */
            fullName?: TextFieldFilter | string;
            recName?: TextFieldFilter | string;
        }>;
    }
};

export type RostersGraph = {
    id?: 1;
    /** Name */
    name?: 1;
    /** Bemerkung */
    comment?: 1;
    /** Bereich */
    orgUnit?: {
        id?: 1;
        /** Name */
        recName?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Name */
            recName?: TextFieldFilter | string;
        }
    };
    /** Ferien */
    holidaySet?: {
        id?: 1;
        /** Name */
        recName?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Name */
            recName?: TextFieldFilter | string;
        }
    };
    /** Archiviert am */
    deletedAt?: 1;
    /** Anzahl der Pläne */
    planCount?: 1;
    /** Dienstpläne */
    plans?: {
        id?: 1;
        /** Name */
        name?: 1;
        /** Beginn */
        validFrom?: 1;
        /** Ende */
        validUntil?: 1;
        /** Veröffentlicht */
        published?: 1;
        /** Archiviert am */
        deletedAt?: 1;
        /** Mitarbeiter */
        users?: {
            id?: 1;
            recName?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                id?: UuidFieldFilter | string;
                recName?: TextFieldFilter | string;
            }
        };
        /** Dienst */
        areas?: {
            id?: 1;
            /** Name */
            name?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }
        };
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Name */
            name?: TextFieldFilter | string;
            /** Beginn */
            validFrom?: BaseFilter<LocalDate> | LocalDate;
            /** Ende */
            validUntil?: BaseFilter<LocalDate> | LocalDate;
            /** Veröffentlicht */
            published?: boolean;
            /** Archiviert am */
            deletedAt?: BaseFilter<LocalDateTime> | LocalDateTime | null;
            /** Mitarbeiter */
            users?: Many2ManyFieldFilter<{
                id?: UuidFieldFilter | string;
                recName?: TextFieldFilter | string;
            }>;
            /** Dienst */
            areas?: One2ManyFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }>;
        }
    };
    writeDate?: 1;
    /** Amount of records to fetch. */
    $limit?: number;
    /** Amounts of records to be skipped. */
    $offset?: number;
    /**
     * Fetch records newer than previously fetched records.
     * It is safe to store and reuse this value to check for updates.
     */
    $cursor?: string
    /** A filter to apply to the to be fetched records. */
    $filter?: {
        id?: UuidFieldFilter | string;
        /** Name */
        name?: TextFieldFilter | string;
        /** Bemerkung */
        comment?: TextFieldFilter | string | null;
        /** Bereich */
        orgUnit?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Name */
            recName?: TextFieldFilter | string;
        }>;
        /** Ferien */
        holidaySet?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Name */
            recName?: TextFieldFilter | string;
        }> | null;
        /** Archiviert am */
        deletedAt?: BaseFilter<LocalDateTime> | LocalDateTime | null;
        /** Anzahl der Pläne */
        planCount?: BaseFilter<number> | number;
        /** Dienstpläne */
        plans?: One2ManyFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Name */
            name?: TextFieldFilter | string;
            /** Beginn */
            validFrom?: BaseFilter<LocalDate> | LocalDate;
            /** Ende */
            validUntil?: BaseFilter<LocalDate> | LocalDate;
            /** Veröffentlicht */
            published?: boolean;
            /** Archiviert am */
            deletedAt?: BaseFilter<LocalDateTime> | LocalDateTime | null;
            /** Mitarbeiter */
            users?: Many2ManyFieldFilter<{
                id?: UuidFieldFilter | string;
                recName?: TextFieldFilter | string;
            }>;
            /** Dienst */
            areas?: One2ManyFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }>;
        }>;
        writeDate?: BaseFilter<LocalDateTime> | LocalDateTime;
    }
};

export type AccountingInvoicesGraph = {
    id?: 1;
    createDate?: 1;
    createUser?: {
        id?: 1;
        recName?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            recName?: TextFieldFilter | string;
        }
    };
    writeDate?: 1;
    writeUser?: {
        id?: 1;
        recName?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            recName?: TextFieldFilter | string;
        }
    };
    /** Archiviert am */
    deletedAt?: 1;
    /** Generiert */
    generated?: 1;
    /** Rechnungsdatum */
    date?: 1;
    /** Leistungszeitraum Von */
    deliveryFrom?: 1;
    /** Leistungszeitraum Bis */
    deliveryUntil?: 1;
    /** Rechnungsnummer */
    number?: 1;
    /** Rechnungsnummer */
    displayNumber?: 1;
    /** Status Art */
    stateType?: {
        id?: 1;
        /** Name */
        name?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Name */
            name?: TextFieldFilter | string;
        }
    };
    /** Art */
    type?: {
        id?: 1;
        /** Beschreibung */
        name?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Beschreibung */
            name?: TextFieldFilter | string;
        }
    };
    /** Debitorenkonto */
    accountNumber?: 1;
    /** Klient */
    client?: {
        id?: 1;
        /** Voller Name */
        fullName?: 1;
        recName?: 1;
        /** Klientennummer */
        customerNumber?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Voller Name */
            fullName?: TextFieldFilter | string;
            recName?: TextFieldFilter | string;
            /** Klientennummer */
            customerNumber?: BaseFilter<number> | number | null;
        }
    };
    /** Konto */
    clientAccount?: {
        id?: 1;
        /** Name */
        recName?: 1;
        /** Art */
        type?: {
            /** Name */
            name?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                /** Name */
                name?: TextFieldFilter | string;
            }
        };
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Name */
            recName?: TextFieldFilter | string;
            /** Art */
            type?: Many2OneFieldFilter<{
                /** Name */
                name?: TextFieldFilter | string;
            }>;
        }
    };
    /** Klient */
    clientName?: 1;
    /** Anschreiben */
    introduction?: 1;
    /** Abschluss */
    closing?: 1;
    /** Kommentar */
    comment?: 1;
    /** Schlagwörter */
    tags?: {
        id?: 1;
        /** Name */
        name?: 1;
        /** Farbe */
        color?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Name */
            name?: TextFieldFilter | string;
            /** Farbe */
            color?: TextFieldFilter | string;
        }
    };
    /** Bereich */
    orgUnit?: {
        id?: 1;
        /** Name */
        recName?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Name */
            recName?: TextFieldFilter | string;
        }
    };
    /** Unternehmen */
    company?: {
        id?: 1;
        /** Name */
        name?: 1;
        /** Name */
        recName?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Name */
            name?: TextFieldFilter | string;
            /** Name */
            recName?: TextFieldFilter | string;
        }
    };
    /** Firma Name */
    companyName?: 1;
    /** Firma Adresszusatz */
    companyStreetAddition?: 1;
    /** Firma Straße */
    companyStreet?: 1;
    /** Firma Postleitzahl */
    companyZip?: 1;
    /** Firma Ort */
    companyCity?: 1;
    /** Empfänger */
    recipient?: {
        id?: 1;
        /** Anrede */
        contactTitle?: {
            id?: 1;
            /** Name */
            name?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }
        };
        /** Name */
        recName?: 1;
        /** Unternehmen */
        company?: {
            id?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                id?: UuidFieldFilter | string;
            }
        };
        /** Vorname */
        firstName?: 1;
        /** Name */
        name?: 1;
        /** Stadt */
        city?: 1;
        /** Straße */
        street?: 1;
        /** Adresszusatz */
        streetAddition?: 1;
        /** Titel */
        title?: 1;
        /** Art */
        type?: 1;
        /** Postleitzahl */
        zip?: 1;
        /** Institution */
        locationName?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Anrede */
            contactTitle?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }> | null;
            /** Name */
            recName?: TextFieldFilter | string;
            /** Unternehmen */
            company?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
            }> | null;
            /** Vorname */
            firstName?: TextFieldFilter | string | null;
            /** Name */
            name?: TextFieldFilter | string;
            /** Stadt */
            city?: TextFieldFilter | string | null;
            /** Straße */
            street?: TextFieldFilter | string | null;
            /** Adresszusatz */
            streetAddition?: TextFieldFilter | string | null;
            /** Titel */
            title?: TextFieldFilter | string | null;
            /** Art */
            type?: TextFieldFilter | string;
            /** Postleitzahl */
            zip?: TextFieldFilter | string | null;
            /** Institution */
            locationName?: TextFieldFilter | string;
        }
    };
    /** Empfänger Firma */
    recipientCompany?: 1;
    /** Empfänger Anrede */
    recipientTitleType?: {
        id?: 1;
        /** Name */
        name?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Name */
            name?: TextFieldFilter | string;
        }
    };
    /** Empfänger Vorname */
    recipientFirstName?: 1;
    /** Ansprechpartner */
    recipientName?: 1;
    /** Empfänger Straße */
    recipientStreet?: 1;
    /** Empfänger Adresszusatz */
    recipientStreetAddition?: 1;
    /** Empfänger Postleitzahl */
    recipientZip?: 1;
    /** Empfänger Stadt */
    recipientCity?: 1;
    /** Empfänger Land */
    recipientCountry?: 1;
    /** Ansprechpartner */
    recipientResponsible?: {
        id?: 1;
        /** Name */
        recName?: 1;
        /** Anrede */
        contactTitle?: {
            id?: 1;
            /** Name */
            name?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }
        };
        /** Vorname */
        firstName?: 1;
        /** Name */
        name?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Name */
            recName?: TextFieldFilter | string;
            /** Anrede */
            contactTitle?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }> | null;
            /** Vorname */
            firstName?: TextFieldFilter | string | null;
            /** Name */
            name?: TextFieldFilter | string;
        }
    };
    /** Ansprechpartner */
    financialResponsible?: {
        id?: 1;
        recName?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            recName?: TextFieldFilter | string;
        }
    };
    /** Aktenzeichen */
    fileReference?: 1;
    /** Erlöskonto */
    contraAccountNumber?: 1;
    /** Kostenstelle */
    costCenter?: 1;
    /** Rechnungssatz */
    invoiceSet?: {
        id?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
        }
    };
    /** Positionen */
    lines?: {
        id?: 1;
        /** Bewilligung */
        approval?: {
            id?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                id?: UuidFieldFilter | string;
            }
        };
        /** Kostenstelle */
        costCenter?: 1;
        /** Beschreibung */
        description?: 1;
        /** Anzahl */
        quantity?: 1;
        /** Sequenz */
        sequence?: 1;
        /** Leistung */
        service?: {
            id?: 1;
            /** Name */
            name?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }
        };
        /** Steuersatz */
        tax?: {
            id?: 1;
            /** Name */
            name?: 1;
            /** Steuersatz */
            rate?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
                /** Steuersatz */
                rate?: BaseFilter<Decimal> | Decimal;
            }
        };
        /** Steuername */
        taxName?: 1;
        /** Steuersatz */
        taxRate?: 1;
        /** Einzelpreis */
        unitPrice?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Bewilligung */
            approval?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
            }> | null;
            /** Kostenstelle */
            costCenter?: TextFieldFilter | string | null;
            /** Beschreibung */
            description?: TextFieldFilter | string;
            /** Anzahl */
            quantity?: BaseFilter<Decimal> | Decimal;
            /** Sequenz */
            sequence?: BaseFilter<number> | number | null;
            /** Leistung */
            service?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }> | null;
            /** Steuersatz */
            tax?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
                /** Steuersatz */
                rate?: BaseFilter<Decimal> | Decimal;
            }> | null;
            /** Steuername */
            taxName?: TextFieldFilter | string | null;
            /** Steuersatz */
            taxRate?: BaseFilter<Decimal> | Decimal | null;
            /** Einzelpreis */
            unitPrice?: BaseFilter<Decimal> | Decimal;
        }
    };
    dueDate?: 1;
    originalDueDate?: 1;
    dunningDueDate?: 1;
    dunningLevel?: 1;
    isOverdue?: 1;
    /** Bezahlt */
    paid?: 1;
    deposits?: {
        id?: 1;
        /** Datum */
        date?: 1;
        /** Betrag */
        amount?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Datum */
            date?: BaseFilter<LocalDate> | LocalDate;
            /** Betrag */
            amount?: BaseFilter<Decimal> | Decimal;
        }
    };
    /** Betrag */
    totalWithTax?: 1;
    /** Betrag Zahlungseingänge */
    depositsTotal?: 1;
    /** Offener Betrag */
    balance?: 1;
    /** Amount of records to fetch. */
    $limit?: number;
    /** Amounts of records to be skipped. */
    $offset?: number;
    /**
     * Fetch records newer than previously fetched records.
     * It is safe to store and reuse this value to check for updates.
     */
    $cursor?: string
    /** A filter to apply to the to be fetched records. */
    $filter?: {
        id?: UuidFieldFilter | string;
        createDate?: BaseFilter<LocalDateTime> | LocalDateTime;
        createUser?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            recName?: TextFieldFilter | string;
        }>;
        writeDate?: BaseFilter<LocalDateTime> | LocalDateTime;
        writeUser?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            recName?: TextFieldFilter | string;
        }>;
        /** Archiviert am */
        deletedAt?: BaseFilter<LocalDateTime> | LocalDateTime | null;
        /** Generiert */
        generated?: boolean;
        /** Rechnungsdatum */
        date?: BaseFilter<LocalDate> | LocalDate;
        /** Leistungszeitraum Von */
        deliveryFrom?: BaseFilter<LocalDate> | LocalDate;
        /** Leistungszeitraum Bis */
        deliveryUntil?: BaseFilter<LocalDate> | LocalDate;
        /** Rechnungsnummer */
        number?: TextFieldFilter | string | null;
        /** Rechnungsnummer */
        displayNumber?: TextFieldFilter | string;
        /** Status Art */
        stateType?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Name */
            name?: TextFieldFilter | string;
        }>;
        /** Art */
        type?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Beschreibung */
            name?: TextFieldFilter | string;
        }>;
        /** Debitorenkonto */
        accountNumber?: TextFieldFilter | string | null;
        /** Klient */
        client?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Voller Name */
            fullName?: TextFieldFilter | string;
            recName?: TextFieldFilter | string;
            /** Klientennummer */
            customerNumber?: BaseFilter<number> | number | null;
        }> | null;
        /** Konto */
        clientAccount?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Name */
            recName?: TextFieldFilter | string;
            /** Art */
            type?: Many2OneFieldFilter<{
                /** Name */
                name?: TextFieldFilter | string;
            }>;
        }> | null;
        /** Klient */
        clientName?: TextFieldFilter | string | null;
        /** Anschreiben */
        introduction?: TextFieldFilter | string | null;
        /** Abschluss */
        closing?: TextFieldFilter | string | null;
        /** Kommentar */
        comment?: TextFieldFilter | string | null;
        /** Schlagwörter */
        tags?: Many2ManyFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Name */
            name?: TextFieldFilter | string;
            /** Farbe */
            color?: TextFieldFilter | string;
        }>;
        /** Bereich */
        orgUnit?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Name */
            recName?: TextFieldFilter | string;
        }>;
        /** Unternehmen */
        company?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Name */
            name?: TextFieldFilter | string;
            /** Name */
            recName?: TextFieldFilter | string;
        }>;
        /** Firma Name */
        companyName?: TextFieldFilter | string | null;
        /** Firma Adresszusatz */
        companyStreetAddition?: TextFieldFilter | string | null;
        /** Firma Straße */
        companyStreet?: TextFieldFilter | string | null;
        /** Firma Postleitzahl */
        companyZip?: TextFieldFilter | string | null;
        /** Firma Ort */
        companyCity?: TextFieldFilter | string | null;
        /** Empfänger */
        recipient?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Anrede */
            contactTitle?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }> | null;
            /** Name */
            recName?: TextFieldFilter | string;
            /** Unternehmen */
            company?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
            }> | null;
            /** Vorname */
            firstName?: TextFieldFilter | string | null;
            /** Name */
            name?: TextFieldFilter | string;
            /** Stadt */
            city?: TextFieldFilter | string | null;
            /** Straße */
            street?: TextFieldFilter | string | null;
            /** Adresszusatz */
            streetAddition?: TextFieldFilter | string | null;
            /** Titel */
            title?: TextFieldFilter | string | null;
            /** Art */
            type?: TextFieldFilter | string;
            /** Postleitzahl */
            zip?: TextFieldFilter | string | null;
            /** Institution */
            locationName?: TextFieldFilter | string;
        }> | null;
        /** Empfänger Firma */
        recipientCompany?: TextFieldFilter | string | null;
        /** Empfänger Anrede */
        recipientTitleType?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Name */
            name?: TextFieldFilter | string;
        }> | null;
        /** Empfänger Vorname */
        recipientFirstName?: TextFieldFilter | string | null;
        /** Ansprechpartner */
        recipientName?: TextFieldFilter | string | null;
        /** Empfänger Straße */
        recipientStreet?: TextFieldFilter | string | null;
        /** Empfänger Adresszusatz */
        recipientStreetAddition?: TextFieldFilter | string | null;
        /** Empfänger Postleitzahl */
        recipientZip?: TextFieldFilter | string | null;
        /** Empfänger Stadt */
        recipientCity?: TextFieldFilter | string | null;
        /** Empfänger Land */
        recipientCountry?: TextFieldFilter | string | null;
        /** Ansprechpartner */
        recipientResponsible?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Name */
            recName?: TextFieldFilter | string;
            /** Anrede */
            contactTitle?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }> | null;
            /** Vorname */
            firstName?: TextFieldFilter | string | null;
            /** Name */
            name?: TextFieldFilter | string;
        }> | null;
        /** Ansprechpartner */
        financialResponsible?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            recName?: TextFieldFilter | string;
        }> | null;
        /** Aktenzeichen */
        fileReference?: TextFieldFilter | string | null;
        /** Erlöskonto */
        contraAccountNumber?: TextFieldFilter | string | null;
        /** Kostenstelle */
        costCenter?: TextFieldFilter | string | null;
        /** Rechnungssatz */
        invoiceSet?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
        }> | null;
        /** Positionen */
        lines?: One2ManyFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Bewilligung */
            approval?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
            }> | null;
            /** Kostenstelle */
            costCenter?: TextFieldFilter | string | null;
            /** Beschreibung */
            description?: TextFieldFilter | string;
            /** Anzahl */
            quantity?: BaseFilter<Decimal> | Decimal;
            /** Sequenz */
            sequence?: BaseFilter<number> | number | null;
            /** Leistung */
            service?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }> | null;
            /** Steuersatz */
            tax?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
                /** Steuersatz */
                rate?: BaseFilter<Decimal> | Decimal;
            }> | null;
            /** Steuername */
            taxName?: TextFieldFilter | string | null;
            /** Steuersatz */
            taxRate?: BaseFilter<Decimal> | Decimal | null;
            /** Einzelpreis */
            unitPrice?: BaseFilter<Decimal> | Decimal;
        }>;
        dueDate?: BaseFilter<LocalDate> | LocalDate;
        originalDueDate?: BaseFilter<LocalDate> | LocalDate;
        dunningDueDate?: BaseFilter<LocalDate> | LocalDate | null;
        dunningLevel?: BaseFilter<number> | number;
        isOverdue?: boolean;
        /** Bezahlt */
        paid?: boolean;
        deposits?: One2ManyFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Datum */
            date?: BaseFilter<LocalDate> | LocalDate;
            /** Betrag */
            amount?: BaseFilter<Decimal> | Decimal;
        }>;
        /** Betrag */
        totalWithTax?: BaseFilter<Decimal> | Decimal;
        /** Betrag Zahlungseingänge */
        depositsTotal?: BaseFilter<Decimal> | Decimal;
        /** Offener Betrag */
        balance?: BaseFilter<Decimal> | Decimal;
    }
};

export type ClientsGraph = {
    id?: 1;
    /** Archiviert am */
    deletedAt?: 1;
    createDate?: 1;
    writeDate?: 1;
    createUser?: {
        id?: 1;
        /** Voller Name */
        fullName?: 1;
        recName?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Voller Name */
            fullName?: TextFieldFilter | string;
            recName?: TextFieldFilter | string;
        }
    };
    writeUser?: {
        id?: 1;
        /** Voller Name */
        fullName?: 1;
        recName?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Voller Name */
            fullName?: TextFieldFilter | string;
            recName?: TextFieldFilter | string;
        }
    };
    /** Breitengrad */
    addressLatitude?: 1;
    /** Längengrad */
    addressLongitude?: 1;
    /** Name */
    name?: 1;
    recName?: 1;
    /** Vorname */
    firstName?: 1;
    /** Voller Name */
    fullName?: 1;
    /** Codename */
    codeName?: 1;
    /** Anrede */
    gender?: {
        id?: 1;
        /** Name */
        name?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Name */
            name?: TextFieldFilter | string;
        }
    };
    /** Geburtstag */
    dayOfBirth?: 1;
    /** Diesjähriger Geburtstag */
    currentBirthday?: 1;
    /** Avatarfarbe */
    avatarColor?: 1;
    /** Straße */
    street?: 1;
    /** Adresszusatz */
    streetAddition?: 1;
    /** Postleitzahl */
    zip?: 1;
    /** Stadt */
    city?: 1;
    /** Geburtsort */
    cityOfBirth?: 1;
    /** Personenkonto */
    accountNumber?: 1;
    /** Kostenstelle */
    costCenter?: 1;
    /** Aufenthaltsstatus */
    residencePermitStatus?: {
        id?: 1;
        /** Name */
        recName?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Name */
            recName?: TextFieldFilter | string;
        }
    };
    /** SV-Nummer */
    socialSecurityNumber?: 1;
    /** Versicherten-Nr. */
    insuranceNumber?: 1;
    /** Versicherten-IK */
    insuranceIk?: 1;
    /** Krankenkasse */
    insuranceCompany?: {
        id?: 1;
        /** Name */
        recName?: 1;
        /** Institution */
        locationName?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Name */
            recName?: TextFieldFilter | string;
            /** Institution */
            locationName?: TextFieldFilter | string;
        }
    };
    /** Bemerkungen */
    notes?: 1;
    /** Kontaktmöglichkeiten */
    contactMechanisms?: {
        id?: 1;
        /** Art */
        type?: 1;
        /** Kontaktart */
        mechanismType?: {
            id?: 1;
            /** Name */
            name?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }
        };
        /** Wert */
        value?: 1;
        /** Bemerkung */
        comment?: 1;
        /** Rechnungsversand */
        invoice?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Art */
            type?: TextFieldFilter | string;
            /** Kontaktart */
            mechanismType?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }>;
            /** Wert */
            value?: TextFieldFilter | string;
            /** Bemerkung */
            comment?: TextFieldFilter | string | null;
            /** Rechnungsversand */
            invoice?: boolean;
        }
    };
    /** Kontakte */
    contacts?: {
        id?: 1;
        /** Beziehung */
        kind?: {
            /** Name */
            name?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                /** Name */
                name?: TextFieldFilter | string;
            }
        };
        /** Sorgeberechtigt */
        custodian?: 1;
        /** Kontakt */
        contact?: {
            id?: 1;
            /** Name */
            recName?: 1;
            /** Name */
            name?: 1;
            /** Vorname */
            firstName?: 1;
            /** Straße */
            street?: 1;
            /** Postleitzahl */
            zip?: 1;
            /** Stadt */
            city?: 1;
            /** Kontaktart */
            contactType?: {
                id?: 1;
                /** Name */
                name?: 1;
                /** Amount of records to fetch. */
                $limit?: number;
                /** Amounts of records to be skipped. */
                $offset?: number;
                /** A filter to apply to the to be fetched records. */
                $filter?: {
                    id?: UuidFieldFilter | string;
                    /** Name */
                    name?: TextFieldFilter | string;
                }
            };
            /** Kontaktmöglichkeiten */
            contactMechanisms?: {
                id?: 1;
                /** Art */
                type?: 1;
                /** Kontaktart */
                mechanismType?: {
                    id?: 1;
                    /** Name */
                    name?: 1;
                    /** Amount of records to fetch. */
                    $limit?: number;
                    /** Amounts of records to be skipped. */
                    $offset?: number;
                    /** A filter to apply to the to be fetched records. */
                    $filter?: {
                        id?: UuidFieldFilter | string;
                        /** Name */
                        name?: TextFieldFilter | string;
                    }
                };
                /** Wert */
                value?: 1;
                /** Bemerkung */
                comment?: 1;
                /** Amount of records to fetch. */
                $limit?: number;
                /** Amounts of records to be skipped. */
                $offset?: number;
                /** A filter to apply to the to be fetched records. */
                $filter?: {
                    id?: UuidFieldFilter | string;
                    /** Art */
                    type?: TextFieldFilter | string;
                    /** Kontaktart */
                    mechanismType?: Many2OneFieldFilter<{
                        id?: UuidFieldFilter | string;
                        /** Name */
                        name?: TextFieldFilter | string;
                    }>;
                    /** Wert */
                    value?: TextFieldFilter | string;
                    /** Bemerkung */
                    comment?: TextFieldFilter | string | null;
                }
            };
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                id?: UuidFieldFilter | string;
                /** Name */
                recName?: TextFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
                /** Vorname */
                firstName?: TextFieldFilter | string | null;
                /** Straße */
                street?: TextFieldFilter | string | null;
                /** Postleitzahl */
                zip?: TextFieldFilter | string | null;
                /** Stadt */
                city?: TextFieldFilter | string | null;
                /** Kontaktart */
                contactType?: Many2OneFieldFilter<{
                    id?: UuidFieldFilter | string;
                    /** Name */
                    name?: TextFieldFilter | string;
                }>;
                /** Kontaktmöglichkeiten */
                contactMechanisms?: One2ManyFieldFilter<{
                    id?: UuidFieldFilter | string;
                    /** Art */
                    type?: TextFieldFilter | string;
                    /** Kontaktart */
                    mechanismType?: Many2OneFieldFilter<{
                        id?: UuidFieldFilter | string;
                        /** Name */
                        name?: TextFieldFilter | string;
                    }>;
                    /** Wert */
                    value?: TextFieldFilter | string;
                    /** Bemerkung */
                    comment?: TextFieldFilter | string | null;
                }>;
            }
        };
        /** Kommentar */
        comment?: 1;
        /** Befugnisse */
        legalAuthorities?: {
            id?: 1;
            /** Name */
            name?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }
        };
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Beziehung */
            kind?: Many2OneFieldFilter<{
                /** Name */
                name?: TextFieldFilter | string;
            }> | null;
            /** Sorgeberechtigt */
            custodian?: boolean | null;
            /** Kontakt */
            contact?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                recName?: TextFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
                /** Vorname */
                firstName?: TextFieldFilter | string | null;
                /** Straße */
                street?: TextFieldFilter | string | null;
                /** Postleitzahl */
                zip?: TextFieldFilter | string | null;
                /** Stadt */
                city?: TextFieldFilter | string | null;
                /** Kontaktart */
                contactType?: Many2OneFieldFilter<{
                    id?: UuidFieldFilter | string;
                    /** Name */
                    name?: TextFieldFilter | string;
                }>;
                /** Kontaktmöglichkeiten */
                contactMechanisms?: One2ManyFieldFilter<{
                    id?: UuidFieldFilter | string;
                    /** Art */
                    type?: TextFieldFilter | string;
                    /** Kontaktart */
                    mechanismType?: Many2OneFieldFilter<{
                        id?: UuidFieldFilter | string;
                        /** Name */
                        name?: TextFieldFilter | string;
                    }>;
                    /** Wert */
                    value?: TextFieldFilter | string;
                    /** Bemerkung */
                    comment?: TextFieldFilter | string | null;
                }>;
            }>;
            /** Kommentar */
            comment?: TextFieldFilter | string | null;
            /** Befugnisse */
            legalAuthorities?: Many2ManyFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }>;
        }
    };
    /** Konten */
    accounts?: {
        id?: 1;
        createDate?: 1;
        createUser?: {
            id?: 1;
            recName?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                id?: UuidFieldFilter | string;
                recName?: TextFieldFilter | string;
            }
        };
        writeDate?: 1;
        writeUser?: {
            id?: 1;
            recName?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                id?: UuidFieldFilter | string;
                recName?: TextFieldFilter | string;
            }
        };
        /** Klient */
        client?: {
            id?: 1;
            /** Voller Name */
            fullName?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                id?: UuidFieldFilter | string;
                /** Voller Name */
                fullName?: TextFieldFilter | string;
            }
        };
        /** Art */
        type?: {
            id?: 1;
            /** Name */
            name?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }
        };
        /** Saldo */
        totalAmount?: 1;
        totalDirect?: 1;
        /** Rechnungsbetrag */
        totalOpen?: 1;
        /** Kurzeitpflege */
        kurzzeitPflege?: 1;
        /** Gültig ab */
        validFrom?: 1;
        /** Eröffnet bis */
        openedUntil?: 1;
        /** Ende */
        validUntil?: 1;
        /** Name */
        recName?: 1;
        /** Verordnung */
        prescriptions?: {
            id?: 1;
            /** Stunden pro Tag */
            hours?: 1;
            /** Gültig ab */
            validFrom?: 1;
            /** Gültig bis */
            validUntil?: 1;
            /** Beschreibung */
            description?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                id?: UuidFieldFilter | string;
                /** Stunden pro Tag */
                hours?: BaseFilter<Decimal> | Decimal | null;
                /** Gültig ab */
                validFrom?: BaseFilter<LocalDate> | LocalDate;
                /** Gültig bis */
                validUntil?: BaseFilter<LocalDate> | LocalDate;
                /** Beschreibung */
                description?: TextFieldFilter | string | null;
            }
        };
        /** Neue Position */
        lines?: {
            id?: 1;
            /** Datum */
            date?: 1;
            /** Ursprung */
            origin?: {
                id?: 1;
                /** Name */
                name?: 1;
                /** Amount of records to fetch. */
                $limit?: number;
                /** Amounts of records to be skipped. */
                $offset?: number;
                /** A filter to apply to the to be fetched records. */
                $filter?: {
                    id?: UuidFieldFilter | string;
                    /** Name */
                    name?: TextFieldFilter | string;
                }
            };
            /** Art */
            type?: {
                id?: 1;
                /** Name */
                name?: 1;
                /** Amount of records to fetch. */
                $limit?: number;
                /** Amounts of records to be skipped. */
                $offset?: number;
                /** A filter to apply to the to be fetched records. */
                $filter?: {
                    id?: UuidFieldFilter | string;
                    /** Name */
                    name?: TextFieldFilter | string;
                }
            };
            /** Konto */
            account?: {
                id?: 1;
                /** Art */
                type?: {
                    /** Art */
                    type?: {
                        id?: 1;
                        /** Name */
                        name?: 1;
                        /** Amount of records to fetch. */
                        $limit?: number;
                        /** Amounts of records to be skipped. */
                        $offset?: number;
                        /** A filter to apply to the to be fetched records. */
                        $filter?: {
                            id?: UuidFieldFilter | string;
                            /** Name */
                            name?: TextFieldFilter | string;
                        }
                    };
                    /** Amount of records to fetch. */
                    $limit?: number;
                    /** Amounts of records to be skipped. */
                    $offset?: number;
                    /** A filter to apply to the to be fetched records. */
                    $filter?: {
                        /** Art */
                        type?: Many2OneFieldFilter<{
                            id?: UuidFieldFilter | string;
                            /** Name */
                            name?: TextFieldFilter | string;
                        }>;
                    }
                };
                /** Ende */
                validUntil?: 1;
                /** Amount of records to fetch. */
                $limit?: number;
                /** Amounts of records to be skipped. */
                $offset?: number;
                /** A filter to apply to the to be fetched records. */
                $filter?: {
                    id?: UuidFieldFilter | string;
                    /** Art */
                    type?: Many2OneFieldFilter<{
                        /** Art */
                        type?: Many2OneFieldFilter<{
                            id?: UuidFieldFilter | string;
                            /** Name */
                            name?: TextFieldFilter | string;
                        }>;
                    }>;
                    /** Ende */
                    validUntil?: BaseFilter<LocalDate> | LocalDate | null;
                }
            };
            /** Anzahl */
            quantity?: 1;
            /** Betrag */
            amount?: 1;
            /** Preis */
            unitPrice?: 1;
            /** Stunden */
            direct?: 1;
            /** Saldo */
            balance?: 1;
            /** Saldo */
            balanceDirect?: 1;
            /** Bemerkung */
            description?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                id?: UuidFieldFilter | string;
                /** Datum */
                date?: BaseFilter<LocalDate> | LocalDate;
                /** Ursprung */
                origin?: Many2OneFieldFilter<{
                    id?: UuidFieldFilter | string;
                    /** Name */
                    name?: TextFieldFilter | string;
                }>;
                /** Art */
                type?: Many2OneFieldFilter<{
                    id?: UuidFieldFilter | string;
                    /** Name */
                    name?: TextFieldFilter | string;
                }> | null;
                /** Konto */
                account?: Many2OneFieldFilter<{
                    id?: UuidFieldFilter | string;
                    /** Art */
                    type?: Many2OneFieldFilter<{
                        /** Art */
                        type?: Many2OneFieldFilter<{
                            id?: UuidFieldFilter | string;
                            /** Name */
                            name?: TextFieldFilter | string;
                        }>;
                    }>;
                    /** Ende */
                    validUntil?: BaseFilter<LocalDate> | LocalDate | null;
                }>;
                /** Anzahl */
                quantity?: BaseFilter<Decimal> | Decimal;
                /** Betrag */
                amount?: BaseFilter<Decimal> | Decimal;
                /** Preis */
                unitPrice?: BaseFilter<Decimal> | Decimal;
                /** Stunden */
                direct?: BaseFilter<Duration> | Duration;
                /** Saldo */
                balance?: BaseFilter<Decimal> | Decimal;
                /** Saldo */
                balanceDirect?: BaseFilter<Duration> | Duration;
                /** Bemerkung */
                description?: TextFieldFilter | string | null;
            }
        };
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            createDate?: BaseFilter<LocalDateTime> | LocalDateTime;
            createUser?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                recName?: TextFieldFilter | string;
            }>;
            writeDate?: BaseFilter<LocalDateTime> | LocalDateTime;
            writeUser?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                recName?: TextFieldFilter | string;
            }>;
            /** Klient */
            client?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Voller Name */
                fullName?: TextFieldFilter | string;
            }>;
            /** Art */
            type?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }>;
            /** Saldo */
            totalAmount?: BaseFilter<Decimal> | Decimal;
            totalDirect?: BaseFilter<Duration> | Duration | null;
            /** Rechnungsbetrag */
            totalOpen?: BaseFilter<Decimal> | Decimal;
            /** Kurzeitpflege */
            kurzzeitPflege?: boolean;
            /** Gültig ab */
            validFrom?: BaseFilter<LocalDate> | LocalDate;
            /** Eröffnet bis */
            openedUntil?: BaseFilter<LocalDate> | LocalDate;
            /** Ende */
            validUntil?: BaseFilter<LocalDate> | LocalDate | null;
            /** Name */
            recName?: TextFieldFilter | string;
            /** Verordnung */
            prescriptions?: One2ManyFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Stunden pro Tag */
                hours?: BaseFilter<Decimal> | Decimal | null;
                /** Gültig ab */
                validFrom?: BaseFilter<LocalDate> | LocalDate;
                /** Gültig bis */
                validUntil?: BaseFilter<LocalDate> | LocalDate;
                /** Beschreibung */
                description?: TextFieldFilter | string | null;
            }>;
            /** Neue Position */
            lines?: One2ManyFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Datum */
                date?: BaseFilter<LocalDate> | LocalDate;
                /** Ursprung */
                origin?: Many2OneFieldFilter<{
                    id?: UuidFieldFilter | string;
                    /** Name */
                    name?: TextFieldFilter | string;
                }>;
                /** Art */
                type?: Many2OneFieldFilter<{
                    id?: UuidFieldFilter | string;
                    /** Name */
                    name?: TextFieldFilter | string;
                }> | null;
                /** Konto */
                account?: Many2OneFieldFilter<{
                    id?: UuidFieldFilter | string;
                    /** Art */
                    type?: Many2OneFieldFilter<{
                        /** Art */
                        type?: Many2OneFieldFilter<{
                            id?: UuidFieldFilter | string;
                            /** Name */
                            name?: TextFieldFilter | string;
                        }>;
                    }>;
                    /** Ende */
                    validUntil?: BaseFilter<LocalDate> | LocalDate | null;
                }>;
                /** Anzahl */
                quantity?: BaseFilter<Decimal> | Decimal;
                /** Betrag */
                amount?: BaseFilter<Decimal> | Decimal;
                /** Preis */
                unitPrice?: BaseFilter<Decimal> | Decimal;
                /** Stunden */
                direct?: BaseFilter<Duration> | Duration;
                /** Saldo */
                balance?: BaseFilter<Decimal> | Decimal;
                /** Saldo */
                balanceDirect?: BaseFilter<Duration> | Duration;
                /** Bemerkung */
                description?: TextFieldFilter | string | null;
            }>;
        }
    };
    /** Maßnahmen */
    actions?: {
        id?: 1;
        /** Beschreibung */
        name?: 1;
        /** Archiviert am */
        deletedAt?: 1;
        /** Name */
        recName?: 1;
        /** Klient */
        client?: {
            id?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                id?: UuidFieldFilter | string;
            }
        };
        /** Hauptmaßnahme */
        mainAction?: 1;
        /** Rechtsgrundlage */
        legalBasis?: {
            id?: 1;
            /** Name */
            name?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }
        };
        /** Gültig ab */
        validFrom?: 1;
        /** Gültig bis */
        validUntil?: 1;
        /** Amt */
        department?: {
            id?: 1;
            /** Name */
            name?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }
        };
        /** Ansprechpartner */
        departmentResponsible?: {
            id?: 1;
            /** Name */
            recName?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                id?: UuidFieldFilter | string;
                /** Name */
                recName?: TextFieldFilter | string;
            }
        };
        /** Einsatzort */
        location?: {
            id?: 1;
            /** Name */
            name?: 1;
            /** Straße */
            street?: 1;
            /** Postleitzahl */
            zip?: 1;
            /** Stadt */
            city?: 1;
            /** Telefon */
            phone?: 1;
            /** Mobil */
            mobilePhone?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
                /** Straße */
                street?: TextFieldFilter | string | null;
                /** Postleitzahl */
                zip?: TextFieldFilter | string | null;
                /** Stadt */
                city?: TextFieldFilter | string | null;
                /** Telefon */
                phone?: TextFieldFilter | string | null;
                /** Mobil */
                mobilePhone?: TextFieldFilter | string | null;
            }
        };
        /** Aktenzeichen */
        fileReference?: 1;
        /** Nächster Bericht */
        reportDueDate?: 1;
        /** Nächstes HPG */
        nextMeeting?: 1;
        /** Mitarbeiter */
        attendants?: {
            /** Gültig ab */
            validFrom?: 1;
            /** Gültig bis */
            validUntil?: 1;
            /** Mitarbeiter */
            user?: {
                id?: 1;
                recName?: 1;
                /** Amount of records to fetch. */
                $limit?: number;
                /** Amounts of records to be skipped. */
                $offset?: number;
                /** A filter to apply to the to be fetched records. */
                $filter?: {
                    id?: UuidFieldFilter | string;
                    recName?: TextFieldFilter | string;
                }
            };
            /** Anteil */
            amount?: 1;
            /** Zuständigkeit */
            attendantKind?: {
                id?: 1;
                /** Name */
                name?: 1;
                /** Amount of records to fetch. */
                $limit?: number;
                /** Amounts of records to be skipped. */
                $offset?: number;
                /** A filter to apply to the to be fetched records. */
                $filter?: {
                    id?: UuidFieldFilter | string;
                    /** Name */
                    name?: TextFieldFilter | string;
                }
            };
            /** Bemerkung */
            comment?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                /** Gültig ab */
                validFrom?: BaseFilter<LocalDate> | LocalDate | null;
                /** Gültig bis */
                validUntil?: BaseFilter<LocalDate> | LocalDate | null;
                /** Mitarbeiter */
                user?: Many2OneFieldFilter<{
                    id?: UuidFieldFilter | string;
                    recName?: TextFieldFilter | string;
                }>;
                /** Anteil */
                amount?: BaseFilter<Decimal> | Decimal;
                /** Zuständigkeit */
                attendantKind?: Many2OneFieldFilter<{
                    id?: UuidFieldFilter | string;
                    /** Name */
                    name?: TextFieldFilter | string;
                }>;
                /** Bemerkung */
                comment?: TextFieldFilter | string | null;
            }
        };
        /** Kontingente */
        quotas?: {
            /** Beschreibung */
            name?: 1;
            /** Art */
            type?: 1;
            /** Buchungslimit */
            limitPeriod?: 1;
            /** Bewilligung */
            timeBase?: 1;
            /** Korrektur */
            corrections?: {
                id?: 1;
                /** Datum */
                date?: 1;
                /** Stunden */
                hours?: 1;
                /** Overhead */
                overheadHours?: 1;
                /** Anzahl */
                quantity?: 1;
                /** Bemerkung */
                comment?: 1;
                /** Amount of records to fetch. */
                $limit?: number;
                /** Amounts of records to be skipped. */
                $offset?: number;
                /** A filter to apply to the to be fetched records. */
                $filter?: {
                    id?: UuidFieldFilter | string;
                    /** Datum */
                    date?: BaseFilter<LocalDate> | LocalDate;
                    /** Stunden */
                    hours?: BaseFilter<Duration> | Duration;
                    /** Overhead */
                    overheadHours?: BaseFilter<Duration> | Duration;
                    /** Anzahl */
                    quantity?: BaseFilter<Decimal> | Decimal;
                    /** Bemerkung */
                    comment?: TextFieldFilter | string | null;
                }
            };
            /** Bewilligungen */
            approvals?: {
                id?: 1;
                /** Beginn */
                validFrom?: 1;
                /** Ende */
                validUntil?: 1;
                /** Stunden */
                hours?: 1;
                /** Overhead */
                overheadHours?: 1;
                /** Anzahl */
                quantity?: 1;
                /** Amount of records to fetch. */
                $limit?: number;
                /** Amounts of records to be skipped. */
                $offset?: number;
                /** A filter to apply to the to be fetched records. */
                $filter?: {
                    id?: UuidFieldFilter | string;
                    /** Beginn */
                    validFrom?: BaseFilter<LocalDate> | LocalDate | null;
                    /** Ende */
                    validUntil?: BaseFilter<LocalDate> | LocalDate | null;
                    /** Stunden */
                    hours?: BaseFilter<Duration> | Duration;
                    /** Overhead */
                    overheadHours?: BaseFilter<Duration> | Duration;
                    /** Anzahl */
                    quantity?: BaseFilter<Decimal> | Decimal;
                }
            };
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                /** Beschreibung */
                name?: TextFieldFilter | string;
                /** Art */
                type?: TextFieldFilter | string;
                /** Buchungslimit */
                limitPeriod?: TextFieldFilter | string;
                /** Bewilligung */
                timeBase?: TextFieldFilter | string;
                /** Korrektur */
                corrections?: One2ManyFieldFilter<{
                    id?: UuidFieldFilter | string;
                    /** Datum */
                    date?: BaseFilter<LocalDate> | LocalDate;
                    /** Stunden */
                    hours?: BaseFilter<Duration> | Duration;
                    /** Overhead */
                    overheadHours?: BaseFilter<Duration> | Duration;
                    /** Anzahl */
                    quantity?: BaseFilter<Decimal> | Decimal;
                    /** Bemerkung */
                    comment?: TextFieldFilter | string | null;
                }>;
                /** Bewilligungen */
                approvals?: One2ManyFieldFilter<{
                    id?: UuidFieldFilter | string;
                    /** Beginn */
                    validFrom?: BaseFilter<LocalDate> | LocalDate | null;
                    /** Ende */
                    validUntil?: BaseFilter<LocalDate> | LocalDate | null;
                    /** Stunden */
                    hours?: BaseFilter<Duration> | Duration;
                    /** Overhead */
                    overheadHours?: BaseFilter<Duration> | Duration;
                    /** Anzahl */
                    quantity?: BaseFilter<Decimal> | Decimal;
                }>;
            }
        };
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Beschreibung */
            name?: TextFieldFilter | string;
            /** Archiviert am */
            deletedAt?: BaseFilter<LocalDateTime> | LocalDateTime | null;
            /** Name */
            recName?: TextFieldFilter | string;
            /** Klient */
            client?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
            }>;
            /** Hauptmaßnahme */
            mainAction?: boolean;
            /** Rechtsgrundlage */
            legalBasis?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }> | null;
            /** Gültig ab */
            validFrom?: BaseFilter<LocalDate> | LocalDate | null;
            /** Gültig bis */
            validUntil?: BaseFilter<LocalDate> | LocalDate | null;
            /** Amt */
            department?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }> | null;
            /** Ansprechpartner */
            departmentResponsible?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                recName?: TextFieldFilter | string;
            }> | null;
            /** Einsatzort */
            location?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
                /** Straße */
                street?: TextFieldFilter | string | null;
                /** Postleitzahl */
                zip?: TextFieldFilter | string | null;
                /** Stadt */
                city?: TextFieldFilter | string | null;
                /** Telefon */
                phone?: TextFieldFilter | string | null;
                /** Mobil */
                mobilePhone?: TextFieldFilter | string | null;
            }> | null;
            /** Aktenzeichen */
            fileReference?: TextFieldFilter | string | null;
            /** Nächster Bericht */
            reportDueDate?: BaseFilter<LocalDate> | LocalDate | null;
            /** Nächstes HPG */
            nextMeeting?: BaseFilter<LocalDate> | LocalDate | null;
            /** Mitarbeiter */
            attendants?: One2ManyFieldFilter<{
                /** Gültig ab */
                validFrom?: BaseFilter<LocalDate> | LocalDate | null;
                /** Gültig bis */
                validUntil?: BaseFilter<LocalDate> | LocalDate | null;
                /** Mitarbeiter */
                user?: Many2OneFieldFilter<{
                    id?: UuidFieldFilter | string;
                    recName?: TextFieldFilter | string;
                }>;
                /** Anteil */
                amount?: BaseFilter<Decimal> | Decimal;
                /** Zuständigkeit */
                attendantKind?: Many2OneFieldFilter<{
                    id?: UuidFieldFilter | string;
                    /** Name */
                    name?: TextFieldFilter | string;
                }>;
                /** Bemerkung */
                comment?: TextFieldFilter | string | null;
            }>;
            /** Kontingente */
            quotas?: One2ManyFieldFilter<{
                /** Beschreibung */
                name?: TextFieldFilter | string;
                /** Art */
                type?: TextFieldFilter | string;
                /** Buchungslimit */
                limitPeriod?: TextFieldFilter | string;
                /** Bewilligung */
                timeBase?: TextFieldFilter | string;
                /** Korrektur */
                corrections?: One2ManyFieldFilter<{
                    id?: UuidFieldFilter | string;
                    /** Datum */
                    date?: BaseFilter<LocalDate> | LocalDate;
                    /** Stunden */
                    hours?: BaseFilter<Duration> | Duration;
                    /** Overhead */
                    overheadHours?: BaseFilter<Duration> | Duration;
                    /** Anzahl */
                    quantity?: BaseFilter<Decimal> | Decimal;
                    /** Bemerkung */
                    comment?: TextFieldFilter | string | null;
                }>;
                /** Bewilligungen */
                approvals?: One2ManyFieldFilter<{
                    id?: UuidFieldFilter | string;
                    /** Beginn */
                    validFrom?: BaseFilter<LocalDate> | LocalDate | null;
                    /** Ende */
                    validUntil?: BaseFilter<LocalDate> | LocalDate | null;
                    /** Stunden */
                    hours?: BaseFilter<Duration> | Duration;
                    /** Overhead */
                    overheadHours?: BaseFilter<Duration> | Duration;
                    /** Anzahl */
                    quantity?: BaseFilter<Decimal> | Decimal;
                }>;
            }>;
        }
    };
    /** Bereich */
    orgUnit?: {
        id?: 1;
        /** Name */
        recName?: 1;
        /** Name */
        name?: 1;
        /** Archiviert am */
        deletedAt?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Name */
            recName?: TextFieldFilter | string;
            /** Name */
            name?: TextFieldFilter | string;
            /** Archiviert am */
            deletedAt?: BaseFilter<LocalDateTime> | LocalDateTime | null;
        }
    };
    /** Gruppen */
    groups?: {
        id?: 1;
        /** Gruppe */
        group?: {
            id?: 1;
            recName?: 1;
            /** Name */
            name?: 1;
            /** Farbe */
            color?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                id?: UuidFieldFilter | string;
                recName?: TextFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
                /** Farbe */
                color?: TextFieldFilter | string;
            }
        };
        /** Von */
        validFrom?: 1;
        /** Bis */
        validUntil?: 1;
        /** Bemerkung */
        comment?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Gruppe */
            group?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                recName?: TextFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
                /** Farbe */
                color?: TextFieldFilter | string;
            }>;
            /** Von */
            validFrom?: BaseFilter<LocalDate> | LocalDate;
            /** Bis */
            validUntil?: BaseFilter<LocalDate> | LocalDate | null;
            /** Bemerkung */
            comment?: TextFieldFilter | string | null;
        }
    };
    /** Gültige Schlagworte */
    validTags?: {
        id?: 1;
        /** Farbe */
        color?: 1;
        /** Beschreibung */
        name?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Farbe */
            color?: TextFieldFilter | string;
            /** Beschreibung */
            name?: TextFieldFilter | string;
        }
    };
    /** Pflegegrade */
    careLevels?: {
        id?: 1;
        /** Gültig ab */
        validFrom?: 1;
        /** Gültig bis */
        validUntil?: 1;
        /** Pflegegrad */
        careLevel?: {
            id?: 1;
            /** Pflegegrad */
            level?: 1;
            /** Name */
            name?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
            /** A filter to apply to the to be fetched records. */
            $filter?: {
                id?: UuidFieldFilter | string;
                /** Pflegegrad */
                level?: BaseFilter<number> | number;
                /** Name */
                name?: TextFieldFilter | string;
            }
        };
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            /** Gültig ab */
            validFrom?: BaseFilter<LocalDate> | LocalDate;
            /** Gültig bis */
            validUntil?: BaseFilter<LocalDate> | LocalDate | null;
            /** Pflegegrad */
            careLevel?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Pflegegrad */
                level?: BaseFilter<number> | number;
                /** Name */
                name?: TextFieldFilter | string;
            }>;
        }
    };
    /** Pflegegrad */
    currentCareLevels?: 1;
    /** Nächste Beratung */
    careLevelNextConsultation?: 1;
    /** Interne Beratung */
    careLevelInternalConsultation?: 1;
    /** Pflegegradansprechpartner */
    careLevelInternalConsultant?: {
        id?: 1;
        recName?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
        /** A filter to apply to the to be fetched records. */
        $filter?: {
            id?: UuidFieldFilter | string;
            recName?: TextFieldFilter | string;
        }
    };
    udf?: {
        Datenschutz?: 1;
        'Entbindung SP'?: 1;
        'AZR- Nummer'?: 1;
        'D-Nummer'?: 1;
        'Bewilligungs-Status'?: {
            recName?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
        };
        'Deutschland-Ticket'?: 1;
        'Steuer ID'?: 1;
        Transponder?: 1;
        IBAN?: 1;
        Auszahlung?: {
            recName?: 1;
            /** Amount of records to fetch. */
            $limit?: number;
            /** Amounts of records to be skipped. */
            $offset?: number;
        };
        'Aufenthalt bis:'?: 1;
        /** Amount of records to fetch. */
        $limit?: number;
        /** Amounts of records to be skipped. */
        $offset?: number;
    };
    /** Amount of records to fetch. */
    $limit?: number;
    /** Amounts of records to be skipped. */
    $offset?: number;
    /**
     * Fetch records newer than previously fetched records.
     * It is safe to store and reuse this value to check for updates.
     */
    $cursor?: string
    /** A filter to apply to the to be fetched records. */
    $filter?: {
        id?: UuidFieldFilter | string;
        /** Archiviert am */
        deletedAt?: BaseFilter<LocalDateTime> | LocalDateTime | null;
        createDate?: BaseFilter<LocalDateTime> | LocalDateTime;
        writeDate?: BaseFilter<LocalDateTime> | LocalDateTime;
        createUser?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Voller Name */
            fullName?: TextFieldFilter | string;
            recName?: TextFieldFilter | string;
        }>;
        writeUser?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Voller Name */
            fullName?: TextFieldFilter | string;
            recName?: TextFieldFilter | string;
        }>;
        /** Breitengrad */
        addressLatitude?: BaseFilter<number> | number | null;
        /** Längengrad */
        addressLongitude?: BaseFilter<number> | number | null;
        /** Name */
        name?: TextFieldFilter | string;
        recName?: TextFieldFilter | string;
        /** Vorname */
        firstName?: TextFieldFilter | string | null;
        /** Voller Name */
        fullName?: TextFieldFilter | string;
        /** Codename */
        codeName?: TextFieldFilter | string | null;
        /** Anrede */
        gender?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Name */
            name?: TextFieldFilter | string;
        }>;
        /** Geburtstag */
        dayOfBirth?: BaseFilter<LocalDate> | LocalDate | null;
        /** Diesjähriger Geburtstag */
        currentBirthday?: BaseFilter<LocalDate> | LocalDate | null;
        /** Avatarfarbe */
        avatarColor?: TextFieldFilter | string | null;
        /** Straße */
        street?: TextFieldFilter | string | null;
        /** Adresszusatz */
        streetAddition?: TextFieldFilter | string | null;
        /** Postleitzahl */
        zip?: TextFieldFilter | string | null;
        /** Stadt */
        city?: TextFieldFilter | string | null;
        /** Geburtsort */
        cityOfBirth?: TextFieldFilter | string | null;
        /** Personenkonto */
        accountNumber?: TextFieldFilter | string | null;
        /** Kostenstelle */
        costCenter?: TextFieldFilter | string | null;
        /** Aufenthaltsstatus */
        residencePermitStatus?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Name */
            recName?: TextFieldFilter | string;
        }> | null;
        /** SV-Nummer */
        socialSecurityNumber?: TextFieldFilter | string | null;
        /** Versicherten-Nr. */
        insuranceNumber?: TextFieldFilter | string | null;
        /** Versicherten-IK */
        insuranceIk?: TextFieldFilter | string | null;
        /** Krankenkasse */
        insuranceCompany?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Name */
            recName?: TextFieldFilter | string;
            /** Institution */
            locationName?: TextFieldFilter | string;
        }> | null;
        /** Bemerkungen */
        notes?: TextFieldFilter | string | null;
        /** Kontaktmöglichkeiten */
        contactMechanisms?: One2ManyFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Art */
            type?: TextFieldFilter | string;
            /** Kontaktart */
            mechanismType?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }>;
            /** Wert */
            value?: TextFieldFilter | string;
            /** Bemerkung */
            comment?: TextFieldFilter | string | null;
            /** Rechnungsversand */
            invoice?: boolean;
        }>;
        /** Kontakte */
        contacts?: One2ManyFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Beziehung */
            kind?: Many2OneFieldFilter<{
                /** Name */
                name?: TextFieldFilter | string;
            }> | null;
            /** Sorgeberechtigt */
            custodian?: boolean | null;
            /** Kontakt */
            contact?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                recName?: TextFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
                /** Vorname */
                firstName?: TextFieldFilter | string | null;
                /** Straße */
                street?: TextFieldFilter | string | null;
                /** Postleitzahl */
                zip?: TextFieldFilter | string | null;
                /** Stadt */
                city?: TextFieldFilter | string | null;
                /** Kontaktart */
                contactType?: Many2OneFieldFilter<{
                    id?: UuidFieldFilter | string;
                    /** Name */
                    name?: TextFieldFilter | string;
                }>;
                /** Kontaktmöglichkeiten */
                contactMechanisms?: One2ManyFieldFilter<{
                    id?: UuidFieldFilter | string;
                    /** Art */
                    type?: TextFieldFilter | string;
                    /** Kontaktart */
                    mechanismType?: Many2OneFieldFilter<{
                        id?: UuidFieldFilter | string;
                        /** Name */
                        name?: TextFieldFilter | string;
                    }>;
                    /** Wert */
                    value?: TextFieldFilter | string;
                    /** Bemerkung */
                    comment?: TextFieldFilter | string | null;
                }>;
            }>;
            /** Kommentar */
            comment?: TextFieldFilter | string | null;
            /** Befugnisse */
            legalAuthorities?: Many2ManyFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }>;
        }>;
        /** Konten */
        accounts?: One2ManyFieldFilter<{
            id?: UuidFieldFilter | string;
            createDate?: BaseFilter<LocalDateTime> | LocalDateTime;
            createUser?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                recName?: TextFieldFilter | string;
            }>;
            writeDate?: BaseFilter<LocalDateTime> | LocalDateTime;
            writeUser?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                recName?: TextFieldFilter | string;
            }>;
            /** Klient */
            client?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Voller Name */
                fullName?: TextFieldFilter | string;
            }>;
            /** Art */
            type?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }>;
            /** Saldo */
            totalAmount?: BaseFilter<Decimal> | Decimal;
            totalDirect?: BaseFilter<Duration> | Duration | null;
            /** Rechnungsbetrag */
            totalOpen?: BaseFilter<Decimal> | Decimal;
            /** Kurzeitpflege */
            kurzzeitPflege?: boolean;
            /** Gültig ab */
            validFrom?: BaseFilter<LocalDate> | LocalDate;
            /** Eröffnet bis */
            openedUntil?: BaseFilter<LocalDate> | LocalDate;
            /** Ende */
            validUntil?: BaseFilter<LocalDate> | LocalDate | null;
            /** Name */
            recName?: TextFieldFilter | string;
            /** Verordnung */
            prescriptions?: One2ManyFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Stunden pro Tag */
                hours?: BaseFilter<Decimal> | Decimal | null;
                /** Gültig ab */
                validFrom?: BaseFilter<LocalDate> | LocalDate;
                /** Gültig bis */
                validUntil?: BaseFilter<LocalDate> | LocalDate;
                /** Beschreibung */
                description?: TextFieldFilter | string | null;
            }>;
            /** Neue Position */
            lines?: One2ManyFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Datum */
                date?: BaseFilter<LocalDate> | LocalDate;
                /** Ursprung */
                origin?: Many2OneFieldFilter<{
                    id?: UuidFieldFilter | string;
                    /** Name */
                    name?: TextFieldFilter | string;
                }>;
                /** Art */
                type?: Many2OneFieldFilter<{
                    id?: UuidFieldFilter | string;
                    /** Name */
                    name?: TextFieldFilter | string;
                }> | null;
                /** Konto */
                account?: Many2OneFieldFilter<{
                    id?: UuidFieldFilter | string;
                    /** Art */
                    type?: Many2OneFieldFilter<{
                        /** Art */
                        type?: Many2OneFieldFilter<{
                            id?: UuidFieldFilter | string;
                            /** Name */
                            name?: TextFieldFilter | string;
                        }>;
                    }>;
                    /** Ende */
                    validUntil?: BaseFilter<LocalDate> | LocalDate | null;
                }>;
                /** Anzahl */
                quantity?: BaseFilter<Decimal> | Decimal;
                /** Betrag */
                amount?: BaseFilter<Decimal> | Decimal;
                /** Preis */
                unitPrice?: BaseFilter<Decimal> | Decimal;
                /** Stunden */
                direct?: BaseFilter<Duration> | Duration;
                /** Saldo */
                balance?: BaseFilter<Decimal> | Decimal;
                /** Saldo */
                balanceDirect?: BaseFilter<Duration> | Duration;
                /** Bemerkung */
                description?: TextFieldFilter | string | null;
            }>;
        }>;
        /** Maßnahmen */
        actions?: One2ManyFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Beschreibung */
            name?: TextFieldFilter | string;
            /** Archiviert am */
            deletedAt?: BaseFilter<LocalDateTime> | LocalDateTime | null;
            /** Name */
            recName?: TextFieldFilter | string;
            /** Klient */
            client?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
            }>;
            /** Hauptmaßnahme */
            mainAction?: boolean;
            /** Rechtsgrundlage */
            legalBasis?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }> | null;
            /** Gültig ab */
            validFrom?: BaseFilter<LocalDate> | LocalDate | null;
            /** Gültig bis */
            validUntil?: BaseFilter<LocalDate> | LocalDate | null;
            /** Amt */
            department?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
            }> | null;
            /** Ansprechpartner */
            departmentResponsible?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                recName?: TextFieldFilter | string;
            }> | null;
            /** Einsatzort */
            location?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
                /** Straße */
                street?: TextFieldFilter | string | null;
                /** Postleitzahl */
                zip?: TextFieldFilter | string | null;
                /** Stadt */
                city?: TextFieldFilter | string | null;
                /** Telefon */
                phone?: TextFieldFilter | string | null;
                /** Mobil */
                mobilePhone?: TextFieldFilter | string | null;
            }> | null;
            /** Aktenzeichen */
            fileReference?: TextFieldFilter | string | null;
            /** Nächster Bericht */
            reportDueDate?: BaseFilter<LocalDate> | LocalDate | null;
            /** Nächstes HPG */
            nextMeeting?: BaseFilter<LocalDate> | LocalDate | null;
            /** Mitarbeiter */
            attendants?: One2ManyFieldFilter<{
                /** Gültig ab */
                validFrom?: BaseFilter<LocalDate> | LocalDate | null;
                /** Gültig bis */
                validUntil?: BaseFilter<LocalDate> | LocalDate | null;
                /** Mitarbeiter */
                user?: Many2OneFieldFilter<{
                    id?: UuidFieldFilter | string;
                    recName?: TextFieldFilter | string;
                }>;
                /** Anteil */
                amount?: BaseFilter<Decimal> | Decimal;
                /** Zuständigkeit */
                attendantKind?: Many2OneFieldFilter<{
                    id?: UuidFieldFilter | string;
                    /** Name */
                    name?: TextFieldFilter | string;
                }>;
                /** Bemerkung */
                comment?: TextFieldFilter | string | null;
            }>;
            /** Kontingente */
            quotas?: One2ManyFieldFilter<{
                /** Beschreibung */
                name?: TextFieldFilter | string;
                /** Art */
                type?: TextFieldFilter | string;
                /** Buchungslimit */
                limitPeriod?: TextFieldFilter | string;
                /** Bewilligung */
                timeBase?: TextFieldFilter | string;
                /** Korrektur */
                corrections?: One2ManyFieldFilter<{
                    id?: UuidFieldFilter | string;
                    /** Datum */
                    date?: BaseFilter<LocalDate> | LocalDate;
                    /** Stunden */
                    hours?: BaseFilter<Duration> | Duration;
                    /** Overhead */
                    overheadHours?: BaseFilter<Duration> | Duration;
                    /** Anzahl */
                    quantity?: BaseFilter<Decimal> | Decimal;
                    /** Bemerkung */
                    comment?: TextFieldFilter | string | null;
                }>;
                /** Bewilligungen */
                approvals?: One2ManyFieldFilter<{
                    id?: UuidFieldFilter | string;
                    /** Beginn */
                    validFrom?: BaseFilter<LocalDate> | LocalDate | null;
                    /** Ende */
                    validUntil?: BaseFilter<LocalDate> | LocalDate | null;
                    /** Stunden */
                    hours?: BaseFilter<Duration> | Duration;
                    /** Overhead */
                    overheadHours?: BaseFilter<Duration> | Duration;
                    /** Anzahl */
                    quantity?: BaseFilter<Decimal> | Decimal;
                }>;
            }>;
        }>;
        /** Bereich */
        orgUnit?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Name */
            recName?: TextFieldFilter | string;
            /** Name */
            name?: TextFieldFilter | string;
            /** Archiviert am */
            deletedAt?: BaseFilter<LocalDateTime> | LocalDateTime | null;
        }>;
        /** Gruppen */
        groups?: One2ManyFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Gruppe */
            group?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                recName?: TextFieldFilter | string;
                /** Name */
                name?: TextFieldFilter | string;
                /** Farbe */
                color?: TextFieldFilter | string;
            }>;
            /** Von */
            validFrom?: BaseFilter<LocalDate> | LocalDate;
            /** Bis */
            validUntil?: BaseFilter<LocalDate> | LocalDate | null;
            /** Bemerkung */
            comment?: TextFieldFilter | string | null;
        }>;
        /** Gültige Schlagworte */
        validTags?: Many2ManyFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Farbe */
            color?: TextFieldFilter | string;
            /** Beschreibung */
            name?: TextFieldFilter | string;
        }>;
        /** Pflegegrade */
        careLevels?: One2ManyFieldFilter<{
            id?: UuidFieldFilter | string;
            /** Gültig ab */
            validFrom?: BaseFilter<LocalDate> | LocalDate;
            /** Gültig bis */
            validUntil?: BaseFilter<LocalDate> | LocalDate | null;
            /** Pflegegrad */
            careLevel?: Many2OneFieldFilter<{
                id?: UuidFieldFilter | string;
                /** Pflegegrad */
                level?: BaseFilter<number> | number;
                /** Name */
                name?: TextFieldFilter | string;
            }>;
        }>;
        /** Pflegegrad */
        currentCareLevels?: TextFieldFilter | string | null;
        /** Nächste Beratung */
        careLevelNextConsultation?: BaseFilter<LocalDate> | LocalDate | null;
        /** Interne Beratung */
        careLevelInternalConsultation?: boolean;
        /** Pflegegradansprechpartner */
        careLevelInternalConsultant?: Many2OneFieldFilter<{
            id?: UuidFieldFilter | string;
            recName?: TextFieldFilter | string;
        }> | null;
        udf?: {
            Datenschutz?: BaseFilter<LocalDate> | LocalDate | null;
            'Entbindung SP'?: BaseFilter<LocalDate> | LocalDate | null;
            'AZR- Nummer'?: TextFieldFilter | string | null;
            'D-Nummer'?: TextFieldFilter | string | null;
            'Bewilligungs-Status'?: Many2OneFieldFilter<{
                recName?: TextFieldFilter | string;
            }> | null;
            'Deutschland-Ticket'?: boolean | null;
            'Steuer ID'?: TextFieldFilter | string | null;
            Transponder?: TextFieldFilter | string | null;
            IBAN?: TextFieldFilter | string | null;
            Auszahlung?: Many2OneFieldFilter<{
                recName?: TextFieldFilter | string;
            }> | null;
            'Aufenthalt bis:'?: BaseFilter<LocalDate> | LocalDate | null;
        };
    }
};

export type Users = {
    id: string;
    writeDate: LocalDateTime;
    /** Breitengrad */
    addressLatitude: number | null;
    /** Längengrad */
    addressLongitude: number | null;
    /** Anrede */
    gender: {
        /** Name */
        name: string;
    };
    /** Titel */
    titleName: string | null;
    /** Vorname */
    firstName: string | null;
    /** Name */
    name: string;
    /** Geburtsdatum */
    dayOfBirth: LocalDate | null;
    /** Personalnummer */
    employmentId: string | null;
    /** Straße */
    street: string | null;
    /** Addresszusatz */
    streetAddition: string | null;
    /** Postleitzahl */
    zip: string | null;
    /** Stadt */
    city: string | null;
    /** Wochenstunden */
    weeklyHours: Decimal | null;
    /** Verträge */
    contracts: {
        /** Vertrag */
        contract: {
            id: string;
            /** Name */
            name: string;
        };
        /** Einrichtung */
        orgUnit: {
            id: string;
            /** Name */
            name: string;
            /** Unternehmen */
            company: {
                id: string;
                /** Name */
                name: string;
            };
        };
        /** Gültig ab */
        validFrom: LocalDate;
        /** Gültig bis */
        validUntil: LocalDate | null;
    }[];
    /** Ziel-Stunden */
    targetHours: {
        /** Sollstundenmodell */
        model: {
            /** Name */
            name: string;
        };
        /** Monatsstunden */
        monthlyHours: Duration | null;
        /** Wochenstunden */
        weeklyHours: Duration | null;
        /** Gültig ab */
        validFrom: LocalDate;
        /** Gültig bis */
        validUntil: LocalDate | null;
    }[];
    /** Qualifikationen */
    workQualifications: {
        /** Qualifikation */
        qualification: {
            /** Name */
            name: string;
        };
        /** Gültig ab */
        validFrom: LocalDate;
        /** Gültig bis */
        validUntil: LocalDate | null;
    }[];
    /** Kostenstellen */
    workCostCenters: {
        /** Gültig ab */
        validFrom: LocalDate;
        /** Gültig bis */
        validUntil: LocalDate | null;
        /** Stammkostenstelle */
        mainCostCenter: {
            /** Name */
            name: string;
            /** Kostenstelle */
            number: string | null;
        } | null;
        /** Kostenstellen */
        costCenters: {
            /** Anteil */
            share: Decimal | null;
            /** Kostenstelle */
            costCenter: {
                /** Name */
                name: string;
                /** Kostenstelle */
                number: string | null;
            };
        }[];
    }[];
    /** Bereiche */
    orgUnits: {
        id: string;
        /** Name */
        name: string;
    }[];
    udf: {
        Erhöhung: LocalDate | null;
        Führungszeugnis: LocalDate | null;
        Führerschein: LocalDate | null;
        Datenschutz: LocalDate | null;
        Verfassungstreue: LocalDate | null;
        'Weiter/Fortbildung': string | null;
        'BEH Ausbildung': LocalDate | null;
    };
    /** Archiviert am */
    deletedAt: LocalDateTime | null;
};

export type UsersAbsences = {
    id: string;
    writeDate: LocalDateTime;
    createDate: LocalDateTime;
    createUser: {
        id: string;
        recName: string;
    };
    writeUser: {
        id: string;
        recName: string;
    };
    /** Mitarbeiter */
    user: {
        id: string;
        /** Voller Name */
        fullName: string;
        recName: string;
    };
    /** Beginn */
    begin: LocalDate;
    /** Ende */
    end: LocalDate;
    /** AU-Art */
    attestationType: {
        id: string;
        /** Name */
        name: string;
        /** Interner Name */
        internalName: string;
    } | null;
    /** Festgestellt am */
    attestationDate: LocalDate | null;
    /** AU seit */
    attestationSince: LocalDate | null;
    /** Voraussichtlich bis */
    attestationUntil: LocalDate | null;
    /** Status */
    status: string;
    /** Art */
    type: string | null;
    /** Unterart */
    subType: {
        /** Name */
        name: string;
    } | null;
    /** Tage */
    totalDays: Decimal;
    /** Kalendertage */
    calendarDays: number | null;
    dirtyForAdmin: boolean | null;
    dirtyForUser: boolean | null;
    /** Nachname Kind */
    childName: string | null;
    /** Vorname Kind */
    childFirstName: string | null;
    /** Geburtstag Kind */
    childDayOfBirth: LocalDate | null;
    vacationEntitlement: {
        /** Bemerkung */
        description: string;
    } | null;
    /** eAU */
    absenceResponse: {
        id: string;
        /** Name */
        name: string;
    } | null;
    /** Zuständigkeit */
    workflowStage: {
        id: string;
        /** Name */
        name: string;
        /** Sequenz */
        sequence: number;
    };
    /** Status */
    absenceStatus: {
        id: string;
        /** Name */
        name: string;
        /** Interner Name */
        internalName: string;
    };
    /** Art */
    absenceType: {
        id: string;
        /** Name */
        recName: string;
        /** Name */
        name: string;
        /** Interner Name */
        internalName: string | null;
        /** Farbe */
        color: string;
        /** Art */
        type: {
            id: string;
            /** Name */
            name: string;
            /** Interner Name */
            internalName: string;
        };
        /** Kontoart */
        accountType: {
            id: string;
            /** Name */
            name: string;
        };
        /** Unterarten */
        subTypes: {
            id: string;
        }[];
        /** Zeitwert */
        timeSource: {
            id: string;
            /** Name */
            name: string;
            /** Interner Name */
            internalName: string;
        };
    };
    /** Unterart */
    absenceSubType: {
        id: string;
        /** Name */
        name: string;
    } | null;
    /** Logs */
    logs: {
        id: string;
        createDate: LocalDateTime;
        createUser: {
            /** Voller Name */
            fullName: string;
        };
        /** Text */
        text: string;
    }[];
    /** Autom. Verteilung */
    automaticDistribution: boolean;
    /** Tage anpassen */
    customDistribution: boolean;
    accountLines: {
        id: string;
        /** Datum */
        date: LocalDate;
        /** Stunden */
        hours: Duration;
        /** Anzahl */
        quantity: Decimal;
        /** Gegenkonto */
        account: {
            /** Art */
            type: {
                id: string;
                /** Name */
                name: string;
                /** Art */
                type: {
                    /** Interner Name */
                    internalName: string;
                };
            };
        };
    }[];
};

export type Contacts = {
    id: string;
    /** Debitorenkonto */
    accountNumber: string | null;
    /** Leitwege-ID */
    ediRoutingId: string;
    /** IK-Nummer */
    ikNumber: string | null;
    /** Breitengrad */
    addressLatitude: number | null;
    /** Längengrad */
    addressLongitude: number | null;
    /** Avatarfarbe */
    avatarColor: string | null;
    /** Avatar */
    avatarImage: string | null;
    /** Stadt */
    city: string | null;
    /** Klient */
    client: {
        id: string;
        /** Voller Name */
        fullName: string;
    } | null;
    /** Bemerkung */
    comment: string | null;
    /** Unternehmen */
    company: {
        id: string;
        /** Name */
        name: string;
        /** Name */
        recName: string;
        /** Kontaktart */
        contactType: {
            id: string;
            /** Name */
            name: string;
        };
        /** Postleitzahl */
        zip: string | null;
        /** Stadt */
        city: string | null;
        /** Straße */
        street: string | null;
        /** Adresszusatz */
        streetAddition: string | null;
        /** Kurzname */
        shortName: string | null;
    } | null;
    /** Kontaktmöglichkeiten */
    contactMechanisms: {
        id: string;
        /** Bemerkung */
        comment: string | null;
        /** Art */
        type: string;
        /** Wert */
        value: string;
        /** Kontaktart */
        mechanismType: {
            id: string;
            /** Name */
            name: string;
        };
        /** Rechnungsversand */
        invoice: boolean;
    }[];
    /** Anrede */
    contactTitle: {
        id: string;
        /** Name */
        name: string;
    } | null;
    /** Kontaktart */
    contactType: {
        id: string;
        /** Name */
        name: string;
    };
    /** Klientenkontakt */
    clientContact: {
        /** Klient */
        client: {
            id: string;
        };
        /** Beziehung */
        kind: {
            id: string;
            /** Name */
            name: string;
        } | null;
    }[];
    /** Archiviert am */
    deletedAt: LocalDateTime | null;
    /** Email */
    email: string | null;
    /** Fax */
    fax: string | null;
    /** Vorname */
    firstName: string | null;
    /** Kontaktart */
    kind: string | null;
    /** Mobil */
    mobilePhone: string | null;
    /** Name */
    name: string;
    /** Telefon */
    phone: string | null;
    /** Name */
    recName: string;
    /** Institution */
    locationName: string;
    /** Referenz */
    reference: string | null;
    /** Kurzname */
    shortName: string | null;
    /** Straße */
    street: string | null;
    /** Adresszusatz */
    streetAddition: string | null;
    /** Unterart */
    subType: {
        id: string;
        /** Name */
        name: string;
        /** Archiviert am */
        deletedAt: LocalDateTime | null;
    } | null;
    /** Titel */
    title: string | null;
    /** Art */
    type: string;
    /** Mitarbeiter */
    user: {
        id: string;
        /** Bereiche */
        orgUnits: {
            id: string;
        }[];
    } | null;
    /** Postleitzahl */
    zip: string | null;
    /** DTA Produktivbetrieb */
    dtaProduction: boolean;
    doBulkInvoice: boolean;
    createDate: LocalDateTime;
    writeDate: LocalDateTime;
    createUser: {
        id: string;
        /** Voller Name */
        fullName: string;
        recName: string;
    };
    writeUser: {
        id: string;
        /** Voller Name */
        fullName: string;
        recName: string;
    };
    udf: {

    };
};

export type Rosters = {
    id: string;
    /** Name */
    name: string;
    /** Bemerkung */
    comment: string | null;
    /** Bereich */
    orgUnit: {
        id: string;
        /** Name */
        recName: string;
    };
    /** Ferien */
    holidaySet: {
        id: string;
        /** Name */
        recName: string;
    } | null;
    /** Archiviert am */
    deletedAt: LocalDateTime | null;
    /** Anzahl der Pläne */
    planCount: number;
    /** Dienstpläne */
    plans: {
        id: string;
        /** Name */
        name: string;
        /** Beginn */
        validFrom: LocalDate;
        /** Ende */
        validUntil: LocalDate;
        /** Veröffentlicht */
        published: boolean;
        /** Archiviert am */
        deletedAt: LocalDateTime | null;
        /** Mitarbeiter */
        users: {
            id: string;
            recName: string;
        }[];
        /** Dienst */
        areas: {
            id: string;
            /** Name */
            name: string;
        }[];
    }[];
    writeDate: LocalDateTime;
};

export type AccountingInvoices = {
    id: string;
    createDate: LocalDateTime;
    createUser: {
        id: string;
        recName: string;
    };
    writeDate: LocalDateTime;
    writeUser: {
        id: string;
        recName: string;
    };
    /** Archiviert am */
    deletedAt: LocalDateTime | null;
    /** Generiert */
    generated: boolean;
    /** Rechnungsdatum */
    date: LocalDate;
    /** Leistungszeitraum Von */
    deliveryFrom: LocalDate;
    /** Leistungszeitraum Bis */
    deliveryUntil: LocalDate;
    /** Rechnungsnummer */
    number: string | null;
    /** Rechnungsnummer */
    displayNumber: string;
    /** Status Art */
    stateType: {
        id: string;
        /** Name */
        name: string;
    };
    /** Art */
    type: {
        id: string;
        /** Beschreibung */
        name: string;
    };
    /** Debitorenkonto */
    accountNumber: string | null;
    /** Klient */
    client: {
        id: string;
        /** Voller Name */
        fullName: string;
        recName: string;
        /** Klientennummer */
        customerNumber: number | null;
    } | null;
    /** Konto */
    clientAccount: {
        id: string;
        /** Name */
        recName: string;
        /** Art */
        type: {
            /** Name */
            name: string;
        };
    } | null;
    /** Klient */
    clientName: string | null;
    /** Anschreiben */
    introduction: string | null;
    /** Abschluss */
    closing: string | null;
    /** Kommentar */
    comment: string | null;
    /** Schlagwörter */
    tags: {
        id: string;
        /** Name */
        name: string;
        /** Farbe */
        color: string;
    }[];
    /** Bereich */
    orgUnit: {
        id: string;
        /** Name */
        recName: string;
    };
    /** Unternehmen */
    company: {
        id: string;
        /** Name */
        name: string;
        /** Name */
        recName: string;
    };
    /** Firma Name */
    companyName: string | null;
    /** Firma Adresszusatz */
    companyStreetAddition: string | null;
    /** Firma Straße */
    companyStreet: string | null;
    /** Firma Postleitzahl */
    companyZip: string | null;
    /** Firma Ort */
    companyCity: string | null;
    /** Empfänger */
    recipient: {
        id: string;
        /** Anrede */
        contactTitle: {
            id: string;
            /** Name */
            name: string;
        } | null;
        /** Name */
        recName: string;
        /** Unternehmen */
        company: {
            id: string;
        } | null;
        /** Vorname */
        firstName: string | null;
        /** Name */
        name: string;
        /** Stadt */
        city: string | null;
        /** Straße */
        street: string | null;
        /** Adresszusatz */
        streetAddition: string | null;
        /** Titel */
        title: string | null;
        /** Art */
        type: string;
        /** Postleitzahl */
        zip: string | null;
        /** Institution */
        locationName: string;
    } | null;
    /** Empfänger Firma */
    recipientCompany: string | null;
    /** Empfänger Anrede */
    recipientTitleType: {
        id: string;
        /** Name */
        name: string;
    } | null;
    /** Empfänger Vorname */
    recipientFirstName: string | null;
    /** Ansprechpartner */
    recipientName: string | null;
    /** Empfänger Straße */
    recipientStreet: string | null;
    /** Empfänger Adresszusatz */
    recipientStreetAddition: string | null;
    /** Empfänger Postleitzahl */
    recipientZip: string | null;
    /** Empfänger Stadt */
    recipientCity: string | null;
    /** Empfänger Land */
    recipientCountry: string | null;
    /** Ansprechpartner */
    recipientResponsible: {
        id: string;
        /** Name */
        recName: string;
        /** Anrede */
        contactTitle: {
            id: string;
            /** Name */
            name: string;
        } | null;
        /** Vorname */
        firstName: string | null;
        /** Name */
        name: string;
    } | null;
    /** Ansprechpartner */
    financialResponsible: {
        id: string;
        recName: string;
    } | null;
    /** Aktenzeichen */
    fileReference: string | null;
    /** Erlöskonto */
    contraAccountNumber: string | null;
    /** Kostenstelle */
    costCenter: string | null;
    /** Rechnungssatz */
    invoiceSet: {
        id: string;
    } | null;
    /** Positionen */
    lines: {
        id: string;
        /** Bewilligung */
        approval: {
            id: string;
        } | null;
        /** Kostenstelle */
        costCenter: string | null;
        /** Beschreibung */
        description: string;
        /** Anzahl */
        quantity: Decimal;
        /** Sequenz */
        sequence: number | null;
        /** Leistung */
        service: {
            id: string;
            /** Name */
            name: string;
        } | null;
        /** Steuersatz */
        tax: {
            id: string;
            /** Name */
            name: string;
            /** Steuersatz */
            rate: Decimal;
        } | null;
        /** Steuername */
        taxName: string | null;
        /** Steuersatz */
        taxRate: Decimal | null;
        /** Einzelpreis */
        unitPrice: Decimal;
    }[];
    dueDate: LocalDate;
    originalDueDate: LocalDate;
    dunningDueDate: LocalDate | null;
    dunningLevel: number;
    isOverdue: boolean;
    /** Bezahlt */
    paid: boolean;
    deposits: {
        id: string;
        /** Datum */
        date: LocalDate;
        /** Betrag */
        amount: Decimal;
    }[];
    /** Betrag */
    totalWithTax: Decimal;
    /** Betrag Zahlungseingänge */
    depositsTotal: Decimal;
    /** Offener Betrag */
    balance: Decimal;
};

export type Clients = {
    id: string;
    /** Archiviert am */
    deletedAt: LocalDateTime | null;
    createDate: LocalDateTime;
    writeDate: LocalDateTime;
    createUser: {
        id: string;
        /** Voller Name */
        fullName: string;
        recName: string;
    };
    writeUser: {
        id: string;
        /** Voller Name */
        fullName: string;
        recName: string;
    };
    /** Breitengrad */
    addressLatitude: number | null;
    /** Längengrad */
    addressLongitude: number | null;
    /** Name */
    name: string;
    recName: string;
    /** Vorname */
    firstName: string | null;
    /** Voller Name */
    fullName: string;
    /** Codename */
    codeName: string | null;
    /** Anrede */
    gender: {
        id: string;
        /** Name */
        name: string;
    };
    /** Geburtstag */
    dayOfBirth: LocalDate | null;
    /** Diesjähriger Geburtstag */
    currentBirthday: LocalDate | null;
    /** Avatarfarbe */
    avatarColor: string | null;
    /** Straße */
    street: string | null;
    /** Adresszusatz */
    streetAddition: string | null;
    /** Postleitzahl */
    zip: string | null;
    /** Stadt */
    city: string | null;
    /** Geburtsort */
    cityOfBirth: string | null;
    /** Personenkonto */
    accountNumber: string | null;
    /** Kostenstelle */
    costCenter: string | null;
    /** Aufenthaltsstatus */
    residencePermitStatus: {
        id: string;
        /** Name */
        recName: string;
    } | null;
    /** SV-Nummer */
    socialSecurityNumber: string | null;
    /** Versicherten-Nr. */
    insuranceNumber: string | null;
    /** Versicherten-IK */
    insuranceIk: string | null;
    /** Krankenkasse */
    insuranceCompany: {
        id: string;
        /** Name */
        recName: string;
        /** Institution */
        locationName: string;
    } | null;
    /** Bemerkungen */
    notes: string | null;
    /** Kontaktmöglichkeiten */
    contactMechanisms: {
        id: string;
        /** Art */
        type: string;
        /** Kontaktart */
        mechanismType: {
            id: string;
            /** Name */
            name: string;
        };
        /** Wert */
        value: string;
        /** Bemerkung */
        comment: string | null;
        /** Rechnungsversand */
        invoice: boolean;
    }[];
    /** Kontakte */
    contacts: {
        id: string;
        /** Beziehung */
        kind: {
            /** Name */
            name: string;
        } | null;
        /** Sorgeberechtigt */
        custodian: boolean | null;
        /** Kontakt */
        contact: {
            id: string;
            /** Name */
            recName: string;
            /** Name */
            name: string;
            /** Vorname */
            firstName: string | null;
            /** Straße */
            street: string | null;
            /** Postleitzahl */
            zip: string | null;
            /** Stadt */
            city: string | null;
            /** Kontaktart */
            contactType: {
                id: string;
                /** Name */
                name: string;
            };
            /** Kontaktmöglichkeiten */
            contactMechanisms: {
                id: string;
                /** Art */
                type: string;
                /** Kontaktart */
                mechanismType: {
                    id: string;
                    /** Name */
                    name: string;
                };
                /** Wert */
                value: string;
                /** Bemerkung */
                comment: string | null;
            }[];
        };
        /** Kommentar */
        comment: string | null;
        /** Befugnisse */
        legalAuthorities: {
            id: string;
            /** Name */
            name: string;
        }[];
    }[];
    /** Konten */
    accounts: {
        id: string;
        createDate: LocalDateTime;
        createUser: {
            id: string;
            recName: string;
        };
        writeDate: LocalDateTime;
        writeUser: {
            id: string;
            recName: string;
        };
        /** Klient */
        client: {
            id: string;
            /** Voller Name */
            fullName: string;
        };
        /** Art */
        type: {
            id: string;
            /** Name */
            name: string;
        };
        /** Saldo */
        totalAmount: Decimal;
        totalDirect: Duration | null;
        /** Rechnungsbetrag */
        totalOpen: Decimal;
        /** Kurzeitpflege */
        kurzzeitPflege: boolean;
        /** Gültig ab */
        validFrom: LocalDate;
        /** Eröffnet bis */
        openedUntil: LocalDate;
        /** Ende */
        validUntil: LocalDate | null;
        /** Name */
        recName: string;
        /** Verordnung */
        prescriptions: {
            id: string;
            /** Stunden pro Tag */
            hours: Decimal | null;
            /** Gültig ab */
            validFrom: LocalDate;
            /** Gültig bis */
            validUntil: LocalDate;
            /** Beschreibung */
            description: string | null;
        }[];
        /** Neue Position */
        lines: {
            id: string;
            /** Datum */
            date: LocalDate;
            /** Ursprung */
            origin: {
                id: string;
                /** Name */
                name: string;
            };
            /** Art */
            type: {
                id: string;
                /** Name */
                name: string;
            } | null;
            /** Konto */
            account: {
                id: string;
                /** Art */
                type: {
                    /** Art */
                    type: {
                        id: string;
                        /** Name */
                        name: string;
                    };
                };
                /** Ende */
                validUntil: LocalDate | null;
            };
            /** Anzahl */
            quantity: Decimal;
            /** Betrag */
            amount: Decimal;
            /** Preis */
            unitPrice: Decimal;
            /** Stunden */
            direct: Duration;
            /** Saldo */
            balance: Decimal;
            /** Saldo */
            balanceDirect: Duration;
            /** Bemerkung */
            description: string | null;
        }[];
    }[];
    /** Maßnahmen */
    actions: {
        id: string;
        /** Beschreibung */
        name: string;
        /** Archiviert am */
        deletedAt: LocalDateTime | null;
        /** Name */
        recName: string;
        /** Klient */
        client: {
            id: string;
        };
        /** Hauptmaßnahme */
        mainAction: boolean;
        /** Rechtsgrundlage */
        legalBasis: {
            id: string;
            /** Name */
            name: string;
        } | null;
        /** Gültig ab */
        validFrom: LocalDate | null;
        /** Gültig bis */
        validUntil: LocalDate | null;
        /** Amt */
        department: {
            id: string;
            /** Name */
            name: string;
        } | null;
        /** Ansprechpartner */
        departmentResponsible: {
            id: string;
            /** Name */
            recName: string;
        } | null;
        /** Einsatzort */
        location: {
            id: string;
            /** Name */
            name: string;
            /** Straße */
            street: string | null;
            /** Postleitzahl */
            zip: string | null;
            /** Stadt */
            city: string | null;
            /** Telefon */
            phone: string | null;
            /** Mobil */
            mobilePhone: string | null;
        } | null;
        /** Aktenzeichen */
        fileReference: string | null;
        /** Nächster Bericht */
        reportDueDate: LocalDate | null;
        /** Nächstes HPG */
        nextMeeting: LocalDate | null;
        /** Mitarbeiter */
        attendants: {
            /** Gültig ab */
            validFrom: LocalDate | null;
            /** Gültig bis */
            validUntil: LocalDate | null;
            /** Mitarbeiter */
            user: {
                id: string;
                recName: string;
            };
            /** Anteil */
            amount: Decimal;
            /** Zuständigkeit */
            attendantKind: {
                id: string;
                /** Name */
                name: string;
            };
            /** Bemerkung */
            comment: string | null;
        }[];
        /** Kontingente */
        quotas: {
            /** Beschreibung */
            name: string;
            /** Art */
            type: string;
            /** Buchungslimit */
            limitPeriod: string;
            /** Bewilligung */
            timeBase: string;
            /** Korrektur */
            corrections: {
                id: string;
                /** Datum */
                date: LocalDate;
                /** Stunden */
                hours: Duration;
                /** Overhead */
                overheadHours: Duration;
                /** Anzahl */
                quantity: Decimal;
                /** Bemerkung */
                comment: string | null;
            }[];
            /** Bewilligungen */
            approvals: {
                id: string;
                /** Beginn */
                validFrom: LocalDate | null;
                /** Ende */
                validUntil: LocalDate | null;
                /** Stunden */
                hours: Duration;
                /** Overhead */
                overheadHours: Duration;
                /** Anzahl */
                quantity: Decimal;
            }[];
        }[];
    }[];
    /** Bereich */
    orgUnit: {
        id: string;
        /** Name */
        recName: string;
        /** Name */
        name: string;
        /** Archiviert am */
        deletedAt: LocalDateTime | null;
    };
    /** Gruppen */
    groups: {
        id: string;
        /** Gruppe */
        group: {
            id: string;
            recName: string;
            /** Name */
            name: string;
            /** Farbe */
            color: string;
        };
        /** Von */
        validFrom: LocalDate;
        /** Bis */
        validUntil: LocalDate | null;
        /** Bemerkung */
        comment: string | null;
    }[];
    /** Gültige Schlagworte */
    validTags: {
        id: string;
        /** Farbe */
        color: string;
        /** Beschreibung */
        name: string;
    }[];
    /** Pflegegrade */
    careLevels: {
        id: string;
        /** Gültig ab */
        validFrom: LocalDate;
        /** Gültig bis */
        validUntil: LocalDate | null;
        /** Pflegegrad */
        careLevel: {
            id: string;
            /** Pflegegrad */
            level: number;
            /** Name */
            name: string;
        };
    }[];
    /** Pflegegrad */
    currentCareLevels: string | null;
    /** Nächste Beratung */
    careLevelNextConsultation: LocalDate | null;
    /** Interne Beratung */
    careLevelInternalConsultation: boolean;
    /** Pflegegradansprechpartner */
    careLevelInternalConsultant: {
        id: string;
        recName: string;
    } | null;
    udf: {
        Datenschutz: LocalDate | null;
        'Entbindung SP': LocalDate | null;
        'AZR- Nummer': string | null;
        'D-Nummer': string | null;
        'Bewilligungs-Status': {
            recName: string;
        } | null;
        'Deutschland-Ticket': boolean | null;
        'Steuer ID': string | null;
        Transponder: string | null;
        IBAN: string | null;
        Auszahlung: {
            recName: string;
        } | null;
        'Aufenthalt bis:': LocalDate | null;
    };
};

const SDK_CHANNEL = 'kilanka-applet-sdk';

/** A pending request awaiting its response from the parent. */
type PendingEntry = Pick<PromiseWithResolvers<unknown>, 'resolve' | 'reject'>;

/** Message sent by the parent once it has connected. */
interface ConnectMessage {
    channel: typeof SDK_CHANNEL;
    kind: 'connect';
}

/** Response to a previously issued request. */
interface ResponseMessage {
    channel: typeof SDK_CHANNEL;
    kind: 'response';
    id: string;
    result?: unknown;
    error?: { message: string };
}

type IncomingMessage = ConnectMessage | ResponseMessage;

export class KilankaAppletSDK {
    #pending = new Map<string, PendingEntry>();
    #seq = 0;
    #parentOrigin: string | null = null; // learned from the connect handshake
    #queue: Array<() => void> = []; // requests issued before the handshake

    constructor() {
        window.addEventListener('message', (event: MessageEvent) => {
            // Only messages from the parent on the matching channel.
            if (event.source !== window.parent) return;
            const data = event.data as IncomingMessage | null | undefined;
            if (!data || data.channel !== SDK_CHANNEL) return;

            if (data.kind === 'connect') {
                // The parent (agent in development, host in production) has
                // announced itself — remember its origin and flush buffered requests.
                this.#parentOrigin = event.origin;
                const queued = this.#queue;
                this.#queue = [];
                for (const send of queued) send();
                return;
            }

            if (data.kind === 'response') {
                // Only accept responses from the connected parent origin.
                if (this.#parentOrigin && event.origin !== this.#parentOrigin)
                    return;
                const entry = this.#pending.get(data.id);
                if (!entry) return;
                this.#pending.delete(data.id);
                if (data.error) entry.reject(new Error(data.error.message));
                else entry.resolve(data.result);
            }
        });

        // Announce presence (without data); the parent replies with "connect".
        window.parent.postMessage({ channel: SDK_CHANNEL, kind: 'hello' }, '*');
    }

    async #devRequest<T>(path: string, graph: unknown): Promise<T> {
        const response = await fetch(`/be/api/public/v2${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(graph),
        });

        if (!response.ok) {
            const text = await response.text();
            let message = text;
            try {
                const json = JSON.parse(text);
                if (json && typeof json === 'object' && 'message' in json) {
                    message = String(json.message);
                }
            } catch {
                // Response body was not JSON — fall back to the raw text.
            }
            throw new Error(
                `Failed to request ${path}: ${response.status}\nRequest-ID: ${response.headers.get(
                    'x-request-id',
                )}\n${message}`,
            );
        }

        return response.json() as Promise<T>;
    }

    #makeRequest<T = unknown>(path: string, graph: unknown): Promise<T> {
        // In development there is no host parent to talk to. When running
        // standalone (not embedded in a host), route the request over the
        // network so vite's server.proxy can forward it to the real Kilanka
        // server with the auth header (see vite.config.ts).
        if (import.meta.env.DEV && window.parent === window) {
            return this.#devRequest<T>(path, graph);
        }

        const { promise, resolve, reject } = Promise.withResolvers<T>();
        const id = `${++this.#seq}`;
        this.#pending.set(id, {
            resolve: resolve as (value: unknown) => void,
            reject,
        });
        const send = () =>
            window.parent.postMessage(
                { channel: SDK_CHANNEL, kind: 'request', id, path, graph },
                this.#parentOrigin!,
            );
        // Buffer before the handshake, otherwise target the parent origin directly.
        if (this.#parentOrigin) send();
        else this.#queue.push(send);
        return promise;
    }
    public async getUsers<Graph extends UsersGraph>(
        graph: Graph,
    ): Promise<{ cursor: string, data: Result<Graph, Users>[] }> {
        return this.#makeRequest('/users', graph) as Promise<{
            cursor: string;
            data: Result<Graph, Users>[]
        }>
    }

    public async getUsersAbsences<Graph extends UsersAbsencesGraph>(
        graph: Graph,
    ): Promise<{ cursor: string, data: Result<Graph, UsersAbsences>[] }> {
        return this.#makeRequest('/users/absences', graph) as Promise<{
            cursor: string;
            data: Result<Graph, UsersAbsences>[]
        }>
    }

    public async getContacts<Graph extends ContactsGraph>(
        graph: Graph,
    ): Promise<{ cursor: string, data: Result<Graph, Contacts>[] }> {
        return this.#makeRequest('/contacts', graph) as Promise<{
            cursor: string;
            data: Result<Graph, Contacts>[]
        }>
    }

    public async getRosters<Graph extends RostersGraph>(
        graph: Graph,
    ): Promise<{ cursor: string, data: Result<Graph, Rosters>[] }> {
        return this.#makeRequest('/rosters', graph) as Promise<{
            cursor: string;
            data: Result<Graph, Rosters>[]
        }>
    }

    public async getAccountingInvoices<Graph extends AccountingInvoicesGraph>(
        graph: Graph,
    ): Promise<{ cursor: string, data: Result<Graph, AccountingInvoices>[] }> {
        return this.#makeRequest('/accounting/invoices', graph) as Promise<{
            cursor: string;
            data: Result<Graph, AccountingInvoices>[]
        }>
    }

    public async getClients<Graph extends ClientsGraph>(
        graph: Graph,
    ): Promise<{ cursor: string, data: Result<Graph, Clients>[] }> {
        return this.#makeRequest('/clients', graph) as Promise<{
            cursor: string;
            data: Result<Graph, Clients>[]
        }>
    }
}
export const sdk = new KilankaAppletSDK();


type Result<Graph, Model> = {
    [K in keyof Graph]: K extends keyof Model
        ? Graph[K] extends Record<PropertyKey, unknown>
            ? Result<Graph[K], Model[K]>
            : Model[K]
        : never;
};