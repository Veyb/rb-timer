## ADDED Requirements

### Requirement: What the catalogue keeps about another server is what differs

The catalogue describes one game server. It MAY also record what another server
states, and that record SHALL be the difference between the two rather than a
second copy of the catalogue.

A boss the two servers agree about SHALL NOT appear in that record. Its absence
is the statement that this server's record applies to it unchanged, so the
record answers "where do they differ" without anyone holding two copies of the
same numbers and wondering which is current.

A boss that does differ SHALL be recorded as completely as this server's bosses
are. A partial record is the worse failure of the two: a copy that omits the
fields a reader would ask about cannot be used at all, and its incompleteness
is invisible until someone tries.

Where the two servers disagree about a value, that value SHALL be taken from
the other server's own pages rather than from any page shared between servers.
Where they cannot disagree — which boss it is, where it stands, what it looks
like — the value SHALL be taken from this server. A boss is the same boss on
both, standing in the same place, and the other server may name it in a
language this catalogue does not use.

The set of differing bosses SHALL be derived by comparison and never listed by
hand, so that a boss which starts or stops differing arrives or leaves on its
own. A comparison that finds no differences at all SHALL be refused rather than
recorded: two servers with nothing between them is what a broken comparison
looks like, and recording it would erase what is known.

Whether the comparison can see every field it would need to SHALL be
established by checking, and the result recorded with its date. A comparison
drawn from a page that states only some fields is a detector with a blind spot,
and the size of that spot is a fact about the source rather than something to
assume.

#### Scenario: A boss both servers agree about is not recorded

- **WHEN** a boss holds the same values on both servers
- **THEN** the record of the other server does not mention it
- **AND** a reader takes this server's record for it unchanged

#### Scenario: A boss that differs is recorded in full

- **WHEN** a boss holds a different level on the other server
- **THEN** its record there carries every field this server's bosses carry,
  not only the fields that differ
- **AND** the values that differ are the other server's own

#### Scenario: Identity is not taken from the other server

- **WHEN** the other server names a boss's location in a different language
- **THEN** the recorded location is this server's
- **AND** only values that can genuinely differ are taken from the other server

#### Scenario: A comparison that finds nothing is refused

- **WHEN** a comparison yields no differing bosses
- **THEN** nothing is written
- **AND** the existing record is left as it was
