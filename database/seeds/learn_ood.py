"""Interview-focused Object-Oriented Design curriculum.

Split out of ``learn.py`` for the same reason the System Design and DSA tracks were:
low-level design is a full interview genre, not a glossary of pattern names. Every lesson
here teaches a decision — when to reach for a construct, what it costs, what the interviewer
asks next, and what a weak answer sounds like next to a strong one.

Rendering constraints (see ``frontend/src/components/learn/markdown.tsx``):

* ``#``/``##``/``###`` headings, tables, blockquotes, ordered lists, flat unordered lists,
  ``a → b → c`` flows, ``x = y`` formula lines, ``Example: ...`` lines and fenced code
  blocks all get first-class rendering.
* Nested list items are NOT supported. Keep every list flat.
* Blockquotes need ``"> "`` on every line, including blank ones - so use a separate
  blockquote per paragraph rather than a blank ``>`` continuation line.
* A literal ``|`` inside a table cell breaks the column split. Write ``OR`` instead.
* ``## Why It Matters`` / ``## How It Works`` / ``## Example`` / ``## Common Use Cases`` /
  ``## Trade-offs`` / ``## Common Mistakes`` / ``## Interview Tip`` are parsed by
  ``app.learn.service._parse_lesson_sections`` to build AI-tutor context, so keep those
  headings on every lesson.
* Heading text must be unique inside a lesson: the in-page table of contents keys anchors
  off the heading slug.
"""

from __future__ import annotations

Section = tuple[str, str]


def OD(
    slug: str,
    title: str,
    short: str,
    minutes: int,
    lead: str,
    sections: list[Section],
    takeaways: list[str],
    questions: list[str],
    problems: list[str] | None = None,
) -> dict:
    """Build a lesson dict from a lead paragraph plus ``## heading`` sections."""
    parts: list[str] = [f"# {title}", "", lead.strip(), ""]
    seen: set[str] = set()
    for heading, body in sections:
        key = heading.strip().lower()
        if key in seen:
            raise ValueError(f"duplicate heading {heading!r} in lesson {slug!r}")
        seen.add(key)
        parts.append(f"## {heading}")
        parts.append("")
        parts.append(body.strip())
        parts.append("")
    return {
        "slug": slug,
        "title": title,
        "short": short,
        "minutes": minutes,
        "content": "\n".join(parts).strip() + "\n",
        "takeaways": takeaways,
        "questions": questions,
        "problems": problems or [],
    }


def _ood_topic(
    slug: str,
    title: str,
    description: str,
    difficulty: str,
    order: int,
    lessons: list[dict],
) -> dict:
    from database.seeds.learn import _topic

    return _topic(
        "ood",
        slug,
        title,
        description,
        difficulty,
        sum(lesson["minutes"] for lesson in lessons),
        order,
        lessons,
    )


# ---------------------------------------------------------------------------
# Module 1 — Foundations
# ---------------------------------------------------------------------------


def _oop_fundamentals_topic() -> dict:
    return _ood_topic(
        "oop-fundamentals",
        "OOP Fundamentals",
        "Encapsulation, abstraction and polymorphism as design tools rather than vocabulary — and when an object is the wrong answer.",
        "EASY",
        1,
        [
            OD(
                "oop-fundamentals",
                "OOP Fundamentals",
                "The four pillars restated as the decisions they actually represent.",
                14,
                "Every candidate can recite encapsulation, inheritance, polymorphism and abstraction. Almost none can say what those words change about a design. This lesson reframes each pillar as a decision you make under pressure, because that is the form the interviewer is testing: not whether you know the word, but whether your class diagram shows you meant it.",
                [
                    (
                        "Why It Matters",
                        """A low-level design interview is forty minutes of you choosing where to put behaviour. The pillars are the vocabulary for defending those choices.

The failure mode is specific and common. A candidate produces a class diagram where every class is a bag of public fields and one service class contains all the logic. Asked why, they say "this is object-oriented, I have classes". They have classes; they do not have objects. The interviewer now has to decide whether the candidate can actually model a domain, and the evidence says no.

> Memory cue: a class with only getters and setters is a struct wearing a costume. Behaviour is what makes it an object.""",
                    ),
                    (
                        "Mental Model",
                        """Each pillar answers one question about where something lives.

| Pillar | The question it answers | What it looks like when you got it right |
| --- | --- | --- |
| **Encapsulation** | Who is allowed to change this state? | Invariants cannot be broken from outside the class |
| **Abstraction** | What does the caller need to know? | The caller depends on a name, not a mechanism |
| **Polymorphism** | Who decides which code runs? | Adding a variant requires no edit to existing callers |
| **Inheritance** | Is this genuinely a kind of that? | Subtypes are substitutable without surprising anyone |

Notice that three of the four are about **reducing what the caller knows**. Inheritance is the odd one out — it is the only pillar that makes a claim about reality rather than about knowledge, which is exactly why it is the one people misuse.""",
                    ),
                    (
                        "How It Works",
                        """### Encapsulation is about invariants, not privacy

The point is not that fields are `private`. The point is that the class guarantees something that stays true no matter what callers do.

```java
// Not encapsulated: any caller can put this account into an impossible state.
class Account {
    public long balanceCents;
}

// Encapsulated: the invariant "balance never goes negative" is enforced in one place.
class Account {
    private long balanceCents;

    void withdraw(long amountCents) {
        if (amountCents <= 0) throw new IllegalArgumentException("amount must be positive");
        if (amountCents > balanceCents) throw new InsufficientFunds(id, amountCents, balanceCents);
        balanceCents -= amountCents;
    }
}
```

The second version has a rule with a single home. The first version has that rule copied into every caller, and one of those copies is wrong.

A useful test: if you added a getter and a setter for every private field, would anything be lost? If not, you never encapsulated anything.

### Abstraction is about what you can change later

An abstraction is a promise that the caller does not need to know how. `List.add` does not say array or linked nodes. `PaymentGateway.charge` does not say Stripe.

The measure of a good abstraction is what it lets you replace without touching callers. If swapping the implementation forces every call site to change, the abstraction leaked.

### Polymorphism is how you delete conditionals

A chain of type checks — `if (s instanceof Circle)`, then `if (s instanceof Square)` — is a decision the compiler could have made for you. Polymorphism moves that decision to the type.

```java
// Every new shape means editing this method - and everything like it.
double area(Shape s) {
    if (s instanceof Circle c) return Math.PI * c.radius() * c.radius();
    if (s instanceof Square q) return q.side() * q.side();
    throw new IllegalArgumentException();
}

// Every new shape is a new file. Nothing existing changes.
interface Shape {
    double area();
}
```

Say this out loud in an interview. "I am replacing a type switch with polymorphism so adding a shape is additive" is a sentence that scores.

### Inheritance is a promise, not a shortcut

`class B extends A` says every B can be used wherever an A is expected, forever. That is a much stronger claim than "B wants A's helper method". Most misuse of inheritance is someone reaching for code reuse and accidentally signing a contract.""",
                    ),
                    (
                        "Example",
                        """Two designs for a coffee order, five minutes apart in an interview.

Weak design — anaemic objects, logic in a service:

```java
class Order { public List<Item> items; public String customerTier; }

class OrderService {
    long total(Order o) {
        long sum = 0;
        for (Item i : o.items) sum += i.price;
        if (o.customerTier.equals("GOLD")) sum = sum * 90 / 100;
        return sum;
    }
}
```

Strong design — behaviour lives with the data it needs:

```java
class Order {
    private final List<Item> items;
    private final Discount discount;

    Money total() {
        Money sum = items.stream().map(Item::price).reduce(Money.ZERO, Money::plus);
        return discount.applyTo(sum);
    }
}

interface Discount { Money applyTo(Money amount); }
```

The second version encapsulates (nobody can mutate `items` behind the order's back), abstracts (the order does not know what a gold customer is), and is polymorphic (a new discount is a new class). It also happens to be shorter at the call site, which is the usual reward.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Any low-level design prompt: the first class you draw sets the tone for the whole interview
- Refactoring questions: "this class is 900 lines, what would you do?"
- Code review scenarios where the interviewer hands you a bad design and watches what you notice
- Java and C# interviews, where the pillars are asked directly and the follow-up is always "show me some code" """,
                    ),
                    (
                        "Trade-offs",
                        """- **Encapsulation vs convenience.** Hiding state means writing methods for every legitimate access. On a genuine data-transfer object, public fields or a record are honest and shorter.
- **Abstraction vs indirection.** Every interface you add is a name the reader has to chase. One implementation behind an interface is usually premature; two is usually justified.
- **Polymorphism vs traceability.** A type switch is ugly but you can read it in one place. Dispatch across ten classes is elegant and hard to follow in a debugger. Prefer polymorphism when the set of variants grows; prefer a switch when it is closed and small.
- **Rich objects vs a transaction script.** For genuinely procedural work — a nightly report, an ETL step — a straightforward function is clearer than five collaborating objects. Say so, rather than object-ifying reflexively.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Defining encapsulation as "make fields private" and stopping there
- Generating a getter and setter for every field, which restores exactly the coupling you removed
- Using inheritance because the parent has a method you want
- Putting all the logic in a `*Service` class and leaving the domain classes as data bags
- Reciting the four pillars without being able to show one in code
- Claiming a design is extensible without naming the specific change it makes cheap""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"Is encapsulation just making fields private?"** No — it is keeping an invariant true. Private fields are the mechanism; the invariant is the point. A class with a private field and a public setter has the mechanism and not the point.

**"When would you not use inheritance?"** When the relationship is not genuinely is-a, when the only motivation is reuse, or when the parent's contract would be violated by the child. Composition covers all three cases.

**"Can you have polymorphism without inheritance?"** Yes. Interfaces give you subtype polymorphism, generics give you parametric polymorphism, and overloading gives you ad-hoc polymorphism. Java has all three.

**"What is an anaemic domain model, and is it always bad?"** Data classes with all logic in services. It is bad when the domain has real rules, because those rules end up duplicated. It is fine at a boundary — a DTO or an API request object should be anaemic on purpose.""",
                    ),
                    (
                        "Interview Tip",
                        """Do not lead with definitions. Lead with the decision.

Weak:

> "Encapsulation means hiding internal state using private fields and providing public getters and setters."

Strong:

> "I am making the balance private because there is one rule — it never goes negative — and I want that rule to have exactly one home. If I expose a setter, the rule moves into every caller and one of them will get it wrong."

Same concept, but the second answer shows you know what the concept buys you.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Take this class and remove the anaemia. Five minutes, no keyboard needed.

```java
class ShoppingCart {
    public List<Item> items = new ArrayList<>();
    public String couponCode;
    public boolean checkedOut;
}
```

You are done when you can answer three things: which invariants the cart guarantees, which methods replace the public fields, and what happens when someone calls a mutating method after checkout.""",
                    ),
                ],
                [
                    "Encapsulation protects an invariant; private fields are only the mechanism.",
                    "An abstraction is worth its indirection only if it lets you swap the implementation.",
                    "Polymorphism is how you make adding a variant additive instead of an edit.",
                    "Inheritance is a substitutability promise, never a reuse shortcut.",
                    "A class with only getters and setters is a data structure, not an object.",
                ],
                [
                    "What is encapsulation, and how is it different from making fields private?",
                    "Show me polymorphism replacing a conditional.",
                    "What is an anaemic domain model? When is it acceptable?",
                    "Can you get polymorphism without inheritance in Java?",
                ],
            ),
            OD(
                "polymorphism-in-practice",
                "Polymorphism in Practice",
                "Subtype, parametric and ad-hoc polymorphism, and the dispatch rules that trip people up.",
                12,
                "Polymorphism is the pillar that shows up most often as a coding question rather than a definition question. Interviewers ask you to remove a conditional, to explain why a method call resolved the way it did, or to design an extension point. All three need the same underlying model of how Java decides which code runs.",
                [
                    (
                        "Why It Matters",
                        """Two things happen in real interviews.

First, a design question: "we need to support a third payment method next quarter — what changes?" If your answer involves editing a switch statement, you have just described a design that breaks the open/closed principle, and the interviewer heard it.

Second, a trick question: overloading versus overriding. Interviewers use it to check whether you understand that Java picks overloads at compile time from the static type, and overrides at runtime from the actual object. Candidates who have only ever read about polymorphism get this wrong.

> Memory cue: overriding is resolved by the object; overloading is resolved by the reference type. One is runtime, one is compile time.""",
                    ),
                    (
                        "Mental Model",
                        """Three kinds, three mechanisms.

| Kind | Java mechanism | Decided at | Typical use |
| --- | --- | --- | --- |
| **Subtype** | interface or superclass reference | Runtime, by the object | Strategy, plugin points, any "many implementations" design |
| **Parametric** | generics, `List<T>` | Compile time, by the type argument | Containers and algorithms that do not care what they hold |
| **Ad-hoc** | overloading | Compile time, by the static types | Convenience overloads at an API boundary |

When an interviewer says "polymorphism" without qualifying it, they almost always mean subtype polymorphism. When they show you two same-named methods, they are testing ad-hoc.""",
                    ),
                    (
                        "How It Works",
                        """### Subtype dispatch

The JVM looks at the object, not the reference.

```java
Shape s = new Circle(2);   // static type Shape, runtime type Circle
s.area();                  // runs Circle.area()
```

This is what lets a caller hold `Shape` and still get circle behaviour. It is also what makes `instanceof` chains redundant most of the time.

### Overload resolution happens before the program runs

```java
void print(Object o) { System.out.println("object"); }
void print(String s) { System.out.println("string"); }

Object value = "hello";
print(value);   // prints "object", not "string"
```

The compiler chose `print(Object)` because the static type of `value` is `Object`. Nothing about the runtime string mattered. This surprises people who expect polymorphism to apply to arguments; in Java it applies only to the receiver.

### Fields and statics do not participate

```java
class Parent { String name = "parent"; static String kind() { return "parent"; } }
class Child extends Parent { String name = "child"; static String kind() { return "child"; } }

Parent p = new Child();
p.name;      // "parent"  - fields are resolved by static type
Parent.kind(); // "parent" - statics are not overridden, only hidden
```

Fields are hidden, not overridden. Static methods are hidden, not overridden. Only instance methods dispatch dynamically. This is a favourite Java trivia question and it has a real design lesson underneath: never rely on a subclass shadowing a parent field, because no one reading the code expects it.

### Designing the extension point

When you want new behaviour to be additive, the shape is always the same: name the thing that varies, give it an interface, and make the varying part a parameter.

```java
interface ShippingRate { Money quote(Parcel parcel); }

final class Checkout {
    private final ShippingRate rate;
    Checkout(ShippingRate rate) { this.rate = rate; }
}
```

Adding overnight shipping is now a new class plus one line of wiring. Nothing in `Checkout` changes, and nothing that already worked can regress.""",
                    ),
                    (
                        "Example",
                        """A notification system, before and after.

```java
// Before: every new channel edits this method and re-tests every channel.
void notifyUser(User u, String message, String channel) {
    if (channel.equals("EMAIL")) { emailClient.send(u.email(), message); }
    else if (channel.equals("SMS")) { smsClient.text(u.phone(), message); }
    else if (channel.equals("PUSH")) { pushClient.push(u.deviceToken(), message); }
    else throw new IllegalArgumentException(channel);
}
```

```java
// After: the channel is an object, and the dispatcher never changes again.
interface Channel { void send(User user, String message); }

final class Notifier {
    private final Map<ChannelType, Channel> channels;
    void notifyUser(User user, String message, ChannelType type) {
        channels.get(type).send(user, message);
    }
}
```

The map lookup replaces the conditional. Adding Slack means writing `SlackChannel` and registering it — and note that the registration itself is the one place that still knows the full set, which is exactly where you want that knowledge.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Removing a type switch that grows every quarter
- Plugin and driver architectures: payment gateways, storage backends, auth providers
- Test doubles — a fake implementation of the same interface is subtype polymorphism doing the work
- Generic containers and algorithms, where parametric polymorphism avoids casting""",
                    ),
                    (
                        "Trade-offs",
                        """- **Dispatch cost is real but small.** A virtual call is slightly more expensive than a direct one and can block inlining. This matters in a tight numeric loop and essentially nowhere else in interview-scale code.
- **Readability moves.** A switch shows every case in one screen. Polymorphism spreads them across files. When the set of cases is fixed and small — days of the week, HTTP methods — a switch or a sealed hierarchy is clearer.
- **Sealed types are the middle ground.** Java's sealed interfaces plus pattern matching give you exhaustiveness checking and a visible case list, with the compiler catching a missed variant. Mention them when the interviewer asks about closed sets.
- **Overloading is easy to overdo.** Five overloads with similar signatures produce resolution surprises and ambiguous calls. Distinct method names are often kinder than clever overloads.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Believing arguments dispatch dynamically in Java — they do not
- Expecting a subclass field to shadow the parent's in a useful way
- Declaring a static method in a subclass and calling it overriding
- Replacing a two-case conditional with four classes and calling it cleaner
- Building an extension point before you have two implementations
- Forgetting that the registry or factory still needs to know every implementation somewhere""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"What is the difference between overloading and overriding?"** Overriding replaces a superclass method and is resolved at runtime from the object. Overloading is several methods with the same name and different parameters, resolved at compile time from the static argument types.

**"Can you override a static method?"** No. Declaring the same signature in a subclass hides it. Calls resolve from the reference type, so it is not polymorphic.

**"What happens if a subclass declares a field with the same name?"** It shadows rather than overrides. Which one you get depends on the static type of the expression, which is why shadowing fields is a bug magnet.

**"How would you support a new payment provider without redeploying the checkout service?"** Interface plus registry, with implementations discovered at startup — a `ServiceLoader`, a Spring bean map, or a config-driven registry. The point is that checkout code never names a provider.""",
                    ),
                    (
                        "Interview Tip",
                        """When you replace a conditional with polymorphism, say what it buys and what it costs in the same breath.

> "I will make the channel an interface with one implementation per transport. Adding a channel becomes a new class instead of an edit to a method everyone depends on. The cost is that you can no longer see all the channels in one place, so I would keep the registry explicit rather than scanning the classpath — that way there is still one file that lists them."

That sentence demonstrates the technique, the benefit, and awareness of the downside. Most candidates supply only the first.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Here is a report exporter. Convert it into an extension point, then answer the follow-up.

```java
String export(Report r, String format) {
    if (format.equals("CSV")) return toCsv(r);
    if (format.equals("JSON")) return toJson(r);
    if (format.equals("PDF")) return toPdf(r);
    throw new IllegalArgumentException(format);
}
```

Follow-up to answer out loud: PDF export needs a page size and CSV export needs a delimiter. Where does that configuration live once each format is its own class?""",
                    ),
                ],
                [
                    "Java dispatches on the receiver at runtime and on argument static types at compile time.",
                    "Fields and static methods are hidden, never overridden.",
                    "Replacing a growing type switch with an interface makes new variants additive.",
                    "Sealed types give you exhaustiveness when the variant set is genuinely closed.",
                    "Something still has to know every implementation — keep that registry explicit.",
                ],
                [
                    "Overloading vs overriding — which is resolved when?",
                    "Can a static method be overridden?",
                    "How do you add a payment provider without editing checkout?",
                    "When is a switch better than polymorphism?",
                ],
            ),
            OD(
                "objects-vs-data-structures",
                "Objects vs Data Structures",
                "When to hide data behind behaviour, when to expose it, and why mixing the two produces the worst designs.",
                11,
                "Not everything should be an object. A design that wraps every piece of data in behaviour is as broken as one that wraps none. The skill interviewers are checking is whether you can tell which side of the line a given type belongs on — and whether you notice when a class has drifted into the middle, where it gets the disadvantages of both.",
                [
                    (
                        "Why It Matters",
                        """Objects and data structures are near-opposites, and the difference decides which changes are cheap.

An object hides its data and exposes behaviour. Adding a new kind of object is easy; adding a new operation across all objects means touching every class.

A data structure exposes its data and has little behaviour. Adding a new operation is easy; adding a new kind means touching every operation that switches on kind.

This is the same trade-off from two directions, and it is why "should this be an interface or a record?" is a real design question rather than a style preference. Candidates who have never thought about it default to making everything a class with getters, which lands them in the worst spot: exposed data *and* scattered behaviour.""",
                    ),
                    (
                        "Mental Model",
                        """Pick the side that makes your expected change cheap.

| | Object | Data structure |
| --- | --- | --- |
| Exposes | Behaviour | Data |
| Cheap to add | A new type | A new operation |
| Expensive to add | A new operation | A new type |
| Java shape | `interface` plus implementations | `record`, DTO, or sealed hierarchy plus pattern matching |
| Example | `PaymentMethod.charge()` | `HttpRequest` fields read by many handlers |

The question to ask in the interview: **which axis is going to grow?** If the product roadmap is "more payment providers", build objects. If it is "more reports over the same data", a data structure with external operations is honest and simpler.""",
                    ),
                    (
                        "How It Works",
                        """### The hybrid is the thing to avoid

A class that exposes half its state through getters and also contains half the logic is the worst of both. Callers reach in for the parts that are exposed, so the class cannot maintain invariants; and the logic that is inside cannot be extended without editing the class. Fowler calls it a hybrid; you will meet it as a 600-line class with 20 getters.

The diagnostic question: can this class guarantee anything about itself? If a caller can put it into a state its own methods would have rejected, it is not really an object.

### Value objects are the useful middle

A value object is a data structure with enough behaviour to protect its own validity. It has no identity, it is immutable, and it is compared by value.

```java
record Money(long amountCents, Currency currency) {
    Money {
        if (currency == null) throw new IllegalArgumentException("currency required");
    }

    Money plus(Money other) {
        if (!currency.equals(other.currency)) throw new CurrencyMismatch(currency, other.currency);
        return new Money(amountCents + other.amountCents, currency);
    }
}
```

`Money` exposes its data — that is fine, the data is the meaning — but you cannot construct a currency-less amount, and you cannot add dollars to euros by accident. Almost every LLD problem improves when you introduce two or three value objects like this instead of passing `long` and `String` around.

### Where the boundary usually falls

- **Inside the domain:** objects. `Order`, `Account`, `Elevator` hide state and enforce rules.
- **At the edges:** data structures. Request bodies, database rows, event payloads, config. These cross a boundary, get serialised, and should stay dumb.
- **Between them:** value objects. `Money`, `EmailAddress`, `DateRange`, `SeatNumber`.

Saying this split out loud in an LLD interview is a strong signal, because it shows you are thinking about layers rather than producing one undifferentiated pile of classes.""",
                    ),
                    (
                        "Example",
                        """A parking fee, done both ways.

As an object — cheap to add a new vehicle kind:

```java
interface Vehicle { Money fee(Duration stay); }

final class Motorcycle implements Vehicle {
    public Money fee(Duration stay) { return Money.cents(50 * stay.toHours()); }
}
```

As a data structure with pattern matching — cheap to add a new operation:

```java
sealed interface Vehicle permits Car, Motorcycle, Truck {}
record Car(String plate) implements Vehicle {}
record Motorcycle(String plate) implements Vehicle {}
record Truck(String plate, int axles) implements Vehicle {}

Money fee(Vehicle v, Duration stay) {
    return switch (v) {
        case Motorcycle m -> Money.cents(50 * stay.toHours());
        case Car c        -> Money.cents(150 * stay.toHours());
        case Truck t      -> Money.cents(300L * t.axles() * stay.toHours());
    };
}
```

Both are defensible. The second is better when the interviewer then asks for a second operation — "now compute the spot size each vehicle needs" — because that is one more function rather than one more method on three classes. The first is better when they ask for electric scooters.

The real answer in an interview is to name the trade-off and pick: "I expect more vehicle types than operations, so I will put the fee on the vehicle. If we end up with a dozen operations I would flip this to a sealed hierarchy." """,
                    ),
                    (
                        "Common Use Cases",
                        """- Choosing between a `record` and an interface at the start of an LLD problem
- Introducing value objects to kill primitive obsession — `Money` instead of `long`, `SeatId` instead of `String`
- API and persistence boundaries, where dumb DTOs prevent domain rules from leaking outward
- Refactoring a hybrid class the interviewer hands you and asks you to critique""",
                    ),
                    (
                        "Trade-offs",
                        """- **Objects make operations expensive.** Ten operations across five types means fifty methods to write and a fat interface. This is the expression problem, and it has no free solution.
- **Data structures make invariants hard.** Anyone can build an invalid one. Constructor validation on a record recovers most of this.
- **Value objects cost allocations.** A `Money` per arithmetic step allocates where a `long` would not. Irrelevant at interview scale; worth naming if the interviewer pushes on performance.
- **Sealed hierarchies close the type set.** You gain exhaustiveness checking and lose third-party extension. That is the right trade when the set is genuinely fixed and the wrong one for a plugin system.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Making every type a class with a getter per field, achieving neither encapsulation nor simplicity
- Primitive obsession: passing `String` for currency, `long` for money, `int` for an identifier
- Putting domain rules in a DTO so they follow the payload out over the wire
- Adding behaviour to a database row class until it cannot be serialised any more
- Treating "everything should be an object" as an axiom rather than a decision""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"When would you use a record instead of a class?"** When the type is data, is immutable, and is compared by value — value objects and DTOs. Not when it needs to hide state or enforce behaviour beyond construction validation.

**"What is primitive obsession and why does it matter?"** Using `String` and `long` where a domain type belongs. It matters because the compiler stops helping: nothing prevents passing a plate number where a ticket id is expected, and validation gets duplicated at every call site.

**"This class has 15 getters and 400 lines of logic. What is wrong?"** It is a hybrid. Callers reach past the behaviour, so invariants cannot hold. I would either push the logic that uses those getters into the class, or accept it is data and move the logic out entirely.

**"How do you decide?"** By asking which axis grows. More types means put behaviour on the type; more operations means keep the data open and the operations outside.""",
                    ),
                    (
                        "Interview Tip",
                        """Introduce one or two value objects in the first five minutes of any LLD problem. It is a cheap, visible signal of taste.

> "Before I model the parking lot itself, I want a `Money` type and a `SpotId` type. Fees show up in three places and I would rather the compiler stop me mixing cents with dollars than find it in a test."

Interviewers notice this because most candidates never do it, and because it usually prevents a bug later in the same interview.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """You are given this signature in a code review:

```java
boolean transfer(String from, String to, double amount, String currency, boolean notify);
```

Rewrite it using value objects and say what each change prevents. Then answer: why is `double` wrong for money, and what would you use instead?""",
                    ),
                ],
                [
                    "Objects make new types cheap; data structures make new operations cheap.",
                    "The hybrid — exposed data plus embedded logic — gets the downsides of both.",
                    "Value objects are immutable, compared by value, and validate in the constructor.",
                    "Keep DTOs dumb at boundaries and keep rules inside the domain.",
                    "Killing primitive obsession early is a cheap, visible taste signal.",
                ],
                [
                    "When would you use a record rather than a class?",
                    "What is primitive obsession and what does it cost?",
                    "Explain the trade-off between a sealed hierarchy and an interface.",
                    "What is wrong with a class that has many getters and lots of logic?",
                ],
            ),
        ],
    )


def _class_relationships_topic() -> dict:
    return _ood_topic(
        "class-relationships",
        "Class Relationships",
        "Association, aggregation, composition and dependency — the arrows on your diagram, and what coupling and cohesion do to a design.",
        "EASY",
        2,
        [
            OD(
                "class-relationships",
                "Class Relationships",
                "The five relationships you draw in an LLD interview and what each one commits you to.",
                13,
                "In a low-level design interview you will draw boxes and connect them. The connections carry meaning: who owns whose lifetime, who can exist without whom, and which direction a change propagates. Candidates who draw undifferentiated lines get asked to explain them; candidates who know the vocabulary answer in one sentence and move on.",
                [
                    (
                        "Why It Matters",
                        """The arrows are where design decisions actually live. Two diagrams with identical boxes can describe completely different systems depending on what the lines mean.

Consider `Order` and `LineItem`. If a line item cannot exist without its order and dies with it, that is composition, and `Order` should own the list and never hand out a mutable reference. If line items are drawn from a shared catalogue and outlive any single order, that is aggregation, and `Order` holds references it did not create and must not delete.

Getting this wrong produces real bugs — cascading deletes that destroy shared data, or orphaned rows nothing cleans up. Interviewers ask about it because it is the cheapest way to find out whether you have shipped software or only read about it.

> Memory cue: composition is "dies with me", aggregation is "borrowed", association is "knows about", dependency is "uses briefly".""",
                    ),
                    (
                        "Mental Model",
                        """Five relationships, ordered from weakest coupling to strongest.

| Relationship | Meaning | Lifetime | Java shape |
| --- | --- | --- | --- |
| **Dependency** | Uses it temporarily | None — appears in a signature only | Method parameter or local variable |
| **Association** | Knows about it long-term | Independent | Field holding a reference |
| **Aggregation** | Has-a, but does not own | Part outlives the whole | Field assigned from outside, often injected |
| **Composition** | Has-a, and owns | Part dies with the whole | Field created inside, never leaked |
| **Inheritance** | Is-a | N/A | `extends` or `implements` |

The practical test for aggregation versus composition: **if I delete the whole, should the part be deleted?** Yes means composition. No means aggregation.""",
                    ),
                    (
                        "How It Works",
                        """### Dependency — the weakest link

A class depends on another if it mentions it without holding it.

```java
class ReportPrinter {
    void print(Report report, Printer printer) {   // depends on both
        printer.send(report.render());
    }
}
```

`ReportPrinter` has no field for either. Change `Printer` and this class recompiles; delete the method and the relationship vanishes. This is the relationship you want wherever you can have it.

### Association — a long-lived reference

```java
class Student {
    private final List<Course> enrolled = new ArrayList<>();
}
```

A student knows its courses; courses exist whether or not that student does. Associations can be one-way or two-way, and two-way is worth flagging: someone now has to keep both sides in sync, and that is a class of bug all by itself.

### Composition — you own the part

```java
final class Order {
    private final List<LineItem> items = new ArrayList<>();   // created here

    void addItem(Product product, int quantity) {
        items.add(new LineItem(product, quantity));           // never handed in from outside
    }

    List<LineItem> items() {
        return List.copyOf(items);                            // never handed out mutably
    }
}
```

Two things make this composition rather than a field that happens to be a list. The items are created inside, and the accessor returns a copy. Return the live list and any caller can violate the order's rules, at which point you have composition on the diagram and an open data structure in reality.

### Aggregation — you hold a part you did not create

```java
final class ParkingLot {
    private final FeePolicy feePolicy;      // injected, shared, outlives this lot

    ParkingLot(FeePolicy feePolicy) {
        this.feePolicy = feePolicy;
    }
}
```

The lot uses the policy and must not dispose of it. On a diagram this is the hollow diamond; in code it is almost always constructor injection.

### The arrow direction is the coupling direction

If `A` holds `B`, then `A` breaks when `B` changes. Draw the arrow from `A` to `B` and read it as "depends on". Good designs point from volatile toward stable — application code toward interfaces, never interfaces toward implementations. That sentence is the dependency inversion principle in one line, and it is easier to see on a diagram than in prose.""",
                    ),
                    (
                        "Example",
                        """A library system. Same four boxes, and the relationships do all the work.

| From | To | Relationship | Why |
| --- | --- | --- | --- |
| `Library` | `BookCopy` | Composition | A copy belongs to exactly one library and is discarded with it |
| `BookCopy` | `Book` | Association | Many copies reference one title; the title outlives every copy |
| `Loan` | `Member` | Association | The member exists before and after the loan |
| `LoanService` | `Clock` | Aggregation | Injected, shared, and faked in tests |
| `LoanService` | `OverdueCalculator` | Dependency | Passed to one method, held nowhere |

Now the design answers questions on its own. Deleting a member with an active loan? Blocked, because `Loan` associates rather than composes. Removing a library? Its copies go with it, but the `Book` titles stay. You did not have to reason about any of that in the moment — the arrows already said it.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Drawing the class diagram in the first ten minutes of any LLD interview
- Deciding whether a repository delete should cascade
- Choosing between creating a collaborator inside a constructor and accepting it as a parameter
- Explaining an existing codebase to an interviewer during a code-reading exercise""",
                    ),
                    (
                        "Trade-offs",
                        """- **Composition simplifies lifetimes but reduces sharing.** If two aggregates genuinely need the same object, composition forces a copy or a duplicate.
- **Aggregation enables sharing but spreads responsibility.** Nobody owns cleanup, so something else has to — a registry, a pool, or a garbage collector you are trusting.
- **Bidirectional associations are convenient and dangerous.** Navigation from both ends is handy; keeping both ends consistent is a permanent tax. Prefer one direction plus a query.
- **Defensive copies cost allocations.** Returning `List.copyOf` on a hot path allocates every call. For interview code it is right; in production you would expose an unmodifiable view or an iterator instead, and it is worth saying so.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Drawing every relationship as a plain line and being unable to say which is which
- Claiming composition while returning the live internal collection from a getter
- Creating collaborators inside a constructor when they should be injected, which destroys testability
- Bidirectional links that are only updated on one side
- Cascading a delete across an association, taking shared data with it
- Modelling inheritance where the real relationship is "has a" or "uses" """,
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"What is the difference between aggregation and composition?"** Lifetime and ownership. In composition the part cannot exist without the whole and is destroyed with it; in aggregation the part is shared and outlives the whole. In code, composition creates the part internally and never leaks it; aggregation receives it.

**"Your `Order` returns its list of items. Is that still composition?"** Not in practice. A caller can mutate the list and bypass every rule the order enforces. I would return an unmodifiable view or a copy.

**"When is a bidirectional association justified?"** When both directions are genuinely hot paths and a lookup would be too slow — and then I would put both updates behind a single method so they cannot drift.

**"How do you show dependency direction in code?"** By which side names the other. If `Checkout` names `PaymentGateway` and `PaymentGateway` never names `Checkout`, the dependency points one way and I can replace the gateway without touching checkout.""",
                    ),
                    (
                        "Interview Tip",
                        """When you draw a line, say what it means before the interviewer asks.

> "Order composes line items — they are created by the order and die with it, so the getter returns a copy. Order aggregates the customer: the customer exists independently, so I take it as a constructor argument and never delete it."

Two sentences, and you have pre-answered three follow-up questions about lifetimes, cascades and encapsulation.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Classify each relationship in a food delivery system as dependency, association, aggregation or composition, and justify the lifetime:

1. `Order` and `OrderItem`
2. `Order` and `Restaurant`
3. `Order` and `DeliveryPartner`
4. `PricingService` and `TaxCalculator`
5. `Restaurant` and `MenuItem`

Then answer the hard one: a restaurant removes a menu item that appears in three historical orders. What breaks, and how does your choice of relationship prevent it?""",
                    ),
                ],
                [
                    "Composition owns the part's lifetime; aggregation borrows a shared part.",
                    "A getter that returns the live collection turns composition into an open data structure.",
                    "The arrow direction is the coupling direction: point from volatile toward stable.",
                    "Bidirectional associations need a single method that updates both sides.",
                    "Dependency — a parameter, not a field — is the weakest and most desirable link.",
                ],
                [
                    "Aggregation vs composition — what actually differs?",
                    "Does returning the internal list break composition?",
                    "When would you accept a bidirectional association?",
                    "How do you tell which way a dependency points from the code alone?",
                ],
            ),
            OD(
                "coupling-and-cohesion",
                "Coupling and Cohesion",
                "The two forces every design decision trades between, with concrete tests for both.",
                12,
                "Coupling and cohesion are the oldest design metrics in software and the ones interviewers most often expect you to use without naming. Every question of the form 'would you split this class?' is really asking whether you can measure cohesion, and every 'what happens when this changes?' is asking about coupling.",
                [
                    (
                        "Why It Matters",
                        """You will be asked to justify a split or a merge, and "it felt cleaner" is not an answer.

Cohesion tells you whether a class has one job. Coupling tells you how far a change travels. Almost every named principle — SRP, DIP, the law of Demeter, layering — is a specific tactic for raising cohesion or lowering coupling. If you understand the two forces, you can derive the principles instead of memorising them, and you can reason about designs the acronyms do not cover.

> Memory cue: high cohesion means the parts of a class belong together. Low coupling means a change here does not become a change there.""",
                    ),
                    (
                        "Mental Model",
                        """Two dials, and you want them in opposite positions.

| Force | Want | Symptom when wrong |
| --- | --- | --- |
| **Cohesion** | High | A class whose methods share no fields; a name containing "Manager" or "And" |
| **Coupling** | Low | One change forces edits in five files; you cannot test A without a real B |

The useful test for cohesion: **for each method, which fields does it touch?** If the methods split cleanly into groups that touch disjoint field sets, you have found the seam where the class wants to divide.

The useful test for coupling: **what do I need to construct in order to test this class?** If the answer includes a database, a clock and a network client, this class is coupled to all three.""",
                    ),
                    (
                        "How It Works",
                        """### Reading cohesion from the fields

```java
class UserManager {
    private final Db db;
    private final SmtpClient smtp;
    private final PasswordHasher hasher;

    void register(...)      { /* uses db, hasher */ }
    void login(...)         { /* uses db, hasher */ }
    void sendWelcome(...)   { /* uses smtp */ }
    void sendReset(...)     { /* uses smtp */ }
}
```

Two field groups, two method groups, no overlap. This class is two classes wearing one name — and the name told you, because "Manager" is what we call a class when we cannot say what it does. Split it into `UserAccounts` and `UserEmails` and each has one reason to change.

### Kinds of coupling, worst to best

| Kind | Description | Verdict |
| --- | --- | --- |
| **Content** | A reaches into B's internals | Avoid always |
| **Global** | Both share mutable global state | Avoid |
| **Control** | A passes a flag that steers B's logic | Smell — split the method |
| **Stamp** | A passes a whole object when B needs one field | Mild; widens the contract |
| **Data** | A passes exactly the values B needs | The goal |

Control coupling is the one that shows up most in interviews, usually as a boolean parameter:

```java
// Control coupling: the caller is steering the method's branches.
void save(Order order, boolean sendEmail, boolean validate) { ... }

// Two honest methods instead.
void save(Order order) { ... }
void saveAndNotify(Order order) { ... }
```

If you see a boolean argument, there is usually a hidden second method inside.

### Afferent and efferent, in one sentence each

Things that depend on you are your afferent coupling: the more there are, the more expensive your changes. Things you depend on are your efferent coupling: the more there are, the more often you are forced to change. Stable, widely used modules should have few dependencies of their own — that is why interfaces, which depend on nothing, make such good load-bearing walls.

### Temporal coupling is the sneaky one

```java
// The caller must call these in exactly this order, and nothing says so.
report.setSource(source);
report.setRange(range);
report.generate();
```

Nothing in the type system prevents `generate()` first. A constructor that takes both, or a builder that validates in `build()`, removes the hazard entirely. Interviewers love this one because the fix is small and the reasoning is visible.""",
                    ),
                    (
                        "Example",
                        """A checkout class, before and after, judged by the two tests.

```java
// Before. Cohesion: low - three unrelated jobs. Coupling: high - names four concrete systems.
class Checkout {
    void checkout(Cart cart, User user) {
        long total = 0;
        for (Item i : cart.items()) total += i.price();
        if (user.tier().equals("GOLD")) total = total * 90 / 100;

        StripeClient.charge(user.cardToken(), total);
        new SmtpClient("mail.internal", 25).send(user.email(), "Receipt", "...");
        Database.getConnection().execute("INSERT INTO orders ...");
    }
}
```

```java
// After. Each collaborator is an interface, injected. Testing needs no network and no database.
final class Checkout {
    private final Pricing pricing;
    private final PaymentGateway payments;
    private final Receipts receipts;
    private final Orders orders;

    Checkout(Pricing pricing, PaymentGateway payments, Receipts receipts, Orders orders) {
        this.pricing = pricing;
        this.payments = payments;
        this.receipts = receipts;
        this.orders = orders;
    }

    OrderId checkout(Cart cart, User user) {
        Money total = pricing.quote(cart, user);
        payments.charge(user.paymentMethod(), total);
        OrderId id = orders.record(cart, user, total);
        receipts.send(user, id, total);
        return id;
    }
}
```

Run the two tests on the second version. Cohesion: every method uses the injected collaborators for one job — completing a checkout. Coupling: constructing it in a test needs four fakes and nothing else. Both dials moved the right way, and the method now reads like the business process it models.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Answering "would you split this class?" with evidence instead of instinct
- Justifying an interface: it lowers coupling from a concrete type to a contract
- Explaining why a 900-line class is hard to change, in terms the interviewer can score
- Choosing module boundaries when the interviewer asks for packages rather than classes""",
                    ),
                    (
                        "Trade-offs",
                        """- **Splitting for cohesion raises the class count.** Twelve one-method classes can be harder to navigate than one coherent class of twelve methods. Split along field usage, not per method.
- **Lowering coupling adds indirection.** Every interface is another hop when reading the code. Introduce one when there is a second implementation, a boundary to fake in tests, or a genuinely volatile dependency.
- **Some coupling is desirable.** A module should be tightly coupled internally; that is what makes it a module. The goal is low coupling *across* boundaries, not everywhere.
- **Dependency injection moves the problem.** Something must still assemble the graph. Concentrating that knowledge in one composition root is the trade you are making, and it is usually the right one.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Naming a class `Manager`, `Helper`, `Util` or `Processor` and calling the job done
- Boolean parameters that select behaviour instead of two named methods
- Static access to a database, clock or HTTP client, which couples the class to a process-wide singleton
- Splitting a class into one class per method and calling it high cohesion
- Adding an interface for every class on principle rather than for a reason
- Reaching through an object to its neighbour's neighbour, which couples you to a structure you do not own""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"How do you know this class should be split?"** Map methods to the fields they touch. Two disjoint groups is the seam. I also read the name: if I need "and" to describe it, it is two classes.

**"What is the worst kind of coupling?"** Content coupling — one class reaching into another's internals — because the inner class can never change safely. Shared mutable global state is a close second since it also breaks tests.

**"Is coupling always bad?"** No. Cohesive modules are internally coupled by design. What you want is low coupling across boundaries and a small, explicit surface at each one.

**"How does dependency injection change coupling?"** It replaces a dependency on a concrete class with one on an interface, and moves construction to a single composition root. The class becomes testable because the collaborators are now parameters.""",
                    ),
                    (
                        "Interview Tip",
                        """Use the testability question as your public reasoning. It is concrete, it is checkable, and it is what senior engineers actually use.

> "I want to unit test the fee calculation without standing up a database or waiting for real time to pass. That means the clock and the repository come in through the constructor as interfaces. That single requirement gives me low coupling almost for free, and it also tells me this class has one job."

You have justified an architectural decision with an executable criterion instead of an adjective.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Here is a class signature from a code review. Find the coupling and cohesion problems, then rewrite the signature.

```java
class OrderProcessor {
    static Db db = Db.global();
    void process(Order o, boolean validate, boolean notify, boolean isRetry) { ... }
}
```

You are done when you can name three separate problems and say what each one costs you at test time.""",
                    ),
                ],
                [
                    "Cohesion: group methods by the fields they touch; disjoint groups are the seam.",
                    "Coupling: whatever you must construct to test a class is what it is coupled to.",
                    "A boolean parameter that selects behaviour is control coupling hiding two methods.",
                    "Low coupling across boundaries, high coupling inside a module, is the goal.",
                    "Manager, Helper and Util are names we use when cohesion has already failed.",
                ],
                [
                    "How do you decide a class should be split?",
                    "Which kind of coupling is worst, and why?",
                    "Is all coupling bad?",
                    "What does dependency injection actually change about coupling?",
                ],
            ),
        ],
    )


def _solid_topic() -> dict:
    return _ood_topic(
        "solid-principles",
        "SOLID Principles",
        "Five principles taught as refactorings you can perform live, plus honest guidance on when each one makes a design worse.",
        "MEDIUM",
        3,
        [
            OD(
                "solid-principles",
                "SOLID Principles",
                "The overview, plus single responsibility done properly — by reason to change, not by line count.",
                14,
                "Everyone can expand the acronym. The interview question is always the next one: show me. This lesson covers what the five principles are collectively for, then goes deep on the one that is most often misquoted — single responsibility, which is about who asks for a change, not about how many methods a class has.",
                [
                    (
                        "Why It Matters",
                        """SOLID exists to make one specific thing cheap: **changing a system without breaking what already works.** Every principle attacks that from a different angle.

- SRP limits how many reasons a class has to change.
- OCP lets you add behaviour without editing tested code.
- LSP keeps polymorphism safe, so a subtype cannot surprise a caller.
- ISP keeps a client from depending on methods it never calls.
- DIP points dependencies at abstractions so implementations can be swapped.

An interviewer asking about SOLID is rarely testing recall. They are testing whether you can look at a class and say which principle it violates and what the refactoring is. That is a skill you build by doing it, not by rereading definitions.

> Memory cue: SOLID is five different answers to the same question — what does it cost to change this later?""",
                    ),
                    (
                        "Mental Model",
                        """Five principles, each with a diagnostic you can run in an interview.

| Principle | One-line test | The smell it fixes |
| --- | --- | --- |
| **SRP** | Who would ask for this class to change? | God classes, Manager classes |
| **OCP** | Can I add a case without editing this file? | Growing switch statements |
| **LSP** | Can I pass the subtype anywhere the parent works? | Subclass throwing UnsupportedOperation |
| **ISP** | Does every implementer use every method? | Empty method bodies |
| **DIP** | Does the high-level policy name a low-level detail? | Business logic importing a driver |

If you remember only one thing per principle, remember these five tests. Definitions get you a nod; diagnostics get you a refactoring.""",
                    ),
                    (
                        "How It Works",
                        """### Single responsibility is about actors, not size

The usual paraphrase, "a class should do one thing", is useless because nobody agrees what one thing is. The precise statement is better: **a class should have one reason to change**, and a reason to change is a person or role who requests it.

```java
class Employee {
    Money calculatePay()  { /* changes when the CFO changes payroll rules */ }
    void save()           { /* changes when the DBA changes the schema */ }
    String reportHours()  { /* changes when Operations changes a report */ }
}
```

Three methods, three different stakeholders, three independent reasons to change. That is the violation — not the line count. When payroll changes, someone edits a class that also contains persistence code, and the diff touches things the CFO never asked about.

The fix separates by actor:

```java
record Employee(EmployeeId id, String name, Grade grade) {}

final class PayrollCalculator { Money calculatePay(Employee e); }
final class EmployeeRepository { void save(Employee e); }
final class HoursReporter     { String reportHours(Employee e); }
```

Now each class has exactly one stakeholder. Notice the shared data moved into a value object rather than being duplicated.

### The test you can run in the room

For each method, ask: "if this needed to change, who would have requested it?" Write the answer next to the method. When you have more than one distinct answer, you have found the split. This takes ninety seconds and produces a defensible diagram.

### Where SRP goes wrong

Applied too literally, SRP produces a class per method and a codebase you cannot navigate. Two guardrails:

- Split by **reason to change**, not by verb. `validate` and `save` may well belong together if only the DBA ever changes either.
- Do not split until there is a second reason. A class with one stakeholder today is correct today; if a second appears, split then.

Say the guardrail out loud in an interview. Candidates who apply SOLID without limits are a known failure mode and interviewers probe for it.""",
                    ),
                    (
                        "Example",
                        """A realistic violation, and the conversation that follows.

```java
class InvoiceService {
    void createInvoice(Order order) {
        BigDecimal subtotal = order.lines().stream()
            .map(Line::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal tax = subtotal.multiply(new BigDecimal("0.20"));   // Finance owns this

        String html = "<html><body>" + subtotal + "</body></html>";    // Design owns this

        jdbc.update("INSERT INTO invoices ...", subtotal, tax);        // The DBA owns this
        smtp.send(order.customerEmail(), "Invoice", html);             // Marketing owns the copy
    }
}
```

Four stakeholders in one method. The practical consequence: a VAT rate change forces a regression test of email rendering, because they ship in the same class.

After splitting by actor:

```java
final class TaxPolicy       { Money taxFor(Money subtotal, Jurisdiction j); }
final class InvoiceRenderer { String render(Invoice invoice); }
interface InvoiceRepository { void save(Invoice invoice); }
interface Mailer            { void send(EmailAddress to, String subject, String body); }

final class CreateInvoice {
    // constructor takes the four collaborators above
    Invoice handle(Order order) { /* orchestration only */ }
}
```

`CreateInvoice` still knows the sequence — that is its single responsibility. Each detail now changes independently.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Refactoring prompts: "this class is 800 lines, what do you do?"
- Justifying the class list at the start of an LLD problem
- Code review exercises where the interviewer wants you to name what is wrong
- Explaining why a change was risky in a behavioural or systems-design discussion""",
                    ),
                    (
                        "Trade-offs",
                        """- **More classes, more indirection.** A reader now follows four files to understand invoicing. The compensation is that each file is comprehensible alone and independently testable.
- **Premature splitting is a real cost.** Splitting before a second stakeholder exists produces abstraction you have to maintain and nobody uses.
- **Orchestration has to live somewhere.** After a split, one class knows the sequence. That class can quietly grow into the god class you removed, so keep it to orchestration and no logic.
- **Team boundaries matter more than aesthetics.** If one team owns tax and rendering, splitting them buys less than the theory suggests. Say that; it reads as experience.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Reciting the acronym without performing a refactoring
- Defining SRP as "one method" or "under 100 lines"
- Splitting every class until the design is a hundred one-method services
- Leaving the orchestrator holding business rules after the split
- Applying SOLID to a script or a throwaway migration where it buys nothing
- Claiming a design is SOLID without naming which change it makes cheap""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"Give me a real SRP violation you have seen."** Have one ready from your own work. A `User` class that hashed passwords, sent emails and wrote to the database is the canonical example and is true in most codebases.

**"How do you know when you have split enough?"** When each class has one stakeholder who would request changes to it. Further splitting adds files without reducing the blast radius of a change.

**"Can SOLID make code worse?"** Yes — routinely. Interface-per-class, a factory for every constructor, and five layers of indirection for one implementation are all SOLID by the letter and worse by every practical measure.

**"Which principle do you use most?"** DIP in practice, because injecting interfaces is what makes code testable, and SRP when reading unfamiliar code because it explains why a class is hard to change.""",
                    ),
                    (
                        "Interview Tip",
                        """Never answer a SOLID question with a definition alone. Answer with a diagnosis and a refactoring.

Weak:

> "Single responsibility means a class should have only one responsibility."

Strong:

> "Single responsibility means one reason to change, where a reason is a stakeholder. This `Employee` class has three: payroll rules, the database schema, and a report format. I would keep `Employee` as data and move each of those into its own class, so a tax change cannot break a report."

The second answer takes fifteen seconds longer and scores in a different band.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """List the stakeholders for each method, then propose a split.

```java
class Booking {
    void reserveSeat(Show show, Seat seat) { }
    Money price(Show show, Seat seat)      { }
    void chargeCard(Card card, Money m)    { }
    void emailTicket(User u, Booking b)    { }
    void writeAuditLog(String event)       { }
}
```

You are done when every resulting class has exactly one stakeholder and you can say which class owns the ordering of these steps.""",
                    ),
                ],
                [
                    "A reason to change is a stakeholder, not a line count.",
                    "Annotate each method with who would request a change; distinct answers mark the split.",
                    "After splitting, the orchestrator keeps the sequence and none of the rules.",
                    "Do not split until a second reason to change actually exists.",
                    "SOLID applied without limits produces a worse design, and interviewers check for that.",
                ],
                [
                    "State SRP precisely and give a real example.",
                    "How do you know when a class has been split enough?",
                    "Can following SOLID make a design worse?",
                    "Which SOLID principle do you reach for most often, and why?",
                ],
            ),
            OD(
                "open-closed-and-liskov",
                "Open/Closed and Liskov",
                "Making behaviour additive, and the substitution rules that decide whether a subclass is legal.",
                13,
                "Open/closed and Liskov are the two principles about extension. The first says new behaviour should not require editing old code; the second says the mechanism you use to extend must not lie to existing callers. They fail together: almost every Liskov violation started as someone trying to be open for extension with inheritance.",
                [
                    (
                        "Why It Matters",
                        """Open/closed is the principle behind almost every design pattern you know. Strategy, factory, decorator, visitor and template method are all mechanisms for adding a case without editing a file that already works.

Liskov is the principle that stops you doing it badly. It is the reason `Square extends Rectangle` is the most famous bad example in software: a square is a rectangle in geometry and not in code, because callers of `setWidth` have expectations a square cannot honour.

Interviewers use OCP to test design instinct ("what changes when we add X?") and LSP to test rigour ("is this inheritance legal?"). The second is the harder question and the one that separates candidates.

> Memory cue: OCP says new behaviour should be a new file. LSP says the new file must not break the old callers.""",
                    ),
                    (
                        "Mental Model",
                        """**Open/closed:** open for extension, closed for modification. In practice — adding a variant should create a file, not produce a diff in one that is already tested.

**Liskov:** if `S` is a subtype of `T`, anywhere a `T` works an `S` must work too. Four concrete rules follow:

| Rule | A subtype may... | It may not... |
| --- | --- | --- |
| **Preconditions** | Accept more inputs | Demand stricter inputs |
| **Postconditions** | Guarantee more | Guarantee less |
| **Invariants** | Add invariants | Weaken the parent's |
| **Exceptions** | Throw fewer | Throw new checked types callers cannot handle |

Read them as one sentence: **a subtype may ask for less and promise more, never the reverse.**""",
                    ),
                    (
                        "How It Works",
                        """### Recognising an OCP violation

The tell is a conditional that grows with the feature list.

```java
BigDecimal shippingCost(Order o) {
    if (o.method() == STANDARD) return standard(o);
    if (o.method() == EXPRESS)  return express(o);
    if (o.method() == OVERNIGHT) return overnight(o);   // added last sprint
    if (o.method() == DRONE)    return drone(o);        // added this sprint
    throw new IllegalStateException();
}
```

Every new method edits this function, which means re-testing every existing method. The fix is the usual one: name the varying thing, give it an interface, and let a registry resolve it.

```java
interface ShippingMethod { Money cost(Order order); }
```

Something still has to map an enum to an implementation. The point is not that the knowledge disappears — it is that it is isolated in a registry whose logic never changes, instead of spread through a method whose logic does.

### Recognising an LSP violation

There are three reliable symptoms, and all of them are easy to spot in a code sample.

- A method that throws `UnsupportedOperationException`
- A caller doing `instanceof` to decide whether the object "really" supports something
- A subclass overriding a method to do nothing

```java
class Bird { void fly() { ... } }
class Penguin extends Bird {
    @Override void fly() { throw new UnsupportedOperationException(); }   // violation
}
```

Every caller that holds a `Bird` and calls `fly()` is now conditionally broken. The fix is to model the capability rather than the taxonomy:

```java
interface Bird { void eat(); }
interface Flying extends Bird { void fly(); }

final class Sparrow implements Flying { }
final class Penguin implements Bird { }
```

Callers that need flight ask for `Flying`, and the compiler enforces what a runtime exception used to.

### The square and rectangle, resolved

```java
class Rectangle {
    void setWidth(int w);
    void setHeight(int h);
    int area();
}

class Square extends Rectangle {
    @Override void setWidth(int w)  { super.setWidth(w); super.setHeight(w); }
    @Override void setHeight(int h) { super.setWidth(h); super.setHeight(h); }
}
```

This breaks the only test that matters:

```java
void checkArea(Rectangle r) {
    r.setWidth(5);
    r.setHeight(4);
    assert r.area() == 20;   // passes for Rectangle, fails for Square
}
```

The caller's postcondition was weakened, so `Square` is not substitutable. The real lesson is not about geometry: **mutability is what created the problem.** Immutable `Rectangle` and `Square` types with no setters compose fine, because there is no sequence of calls to violate. When an interviewer raises this example, that is the answer that ends the discussion.""",
                    ),
                    (
                        "Example",
                        """A payment refund, where the Liskov violation is subtle enough to reach production.

```java
interface PaymentMethod {
    /** Refunds the given amount. Never throws for an amount at or below the original charge. */
    void refund(Money amount);
}

final class CardPayment implements PaymentMethod {
    public void refund(Money amount) { gateway.refund(chargeId, amount); }
}

final class GiftCardPayment implements PaymentMethod {
    public void refund(Money amount) {
        if (amount.isLessThan(originalCharge)) {
            throw new UnsupportedOperationException("gift cards refund in full only");
        }
        gateway.refundFull(chargeId);
    }
}
```

`GiftCardPayment` strengthened a precondition: it demands a full amount where the interface promised any amount would work. Every caller written against the interface is now wrong for one implementation, and the failure only appears with a partial refund of a gift card.

Two legitimate fixes:

1. Widen the contract honestly — `RefundResult refund(Money amount)` where the result can be `PARTIAL_NOT_SUPPORTED`, so callers must handle it and the compiler reminds them.
2. Split the capability — `PaymentMethod` and `SupportsPartialRefund`, so a caller that needs partial refunds asks for the narrower type.

Either is defensible. What is not defensible is leaving an implementation that throws on inputs the interface documented as valid.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Any prompt containing "and next quarter we will also support…"
- Reviewing an inheritance hierarchy the interviewer hands you
- Designing plugin points: gateways, exporters, notification channels, storage backends
- Justifying an interface split when one implementation cannot honour the whole contract""",
                    ),
                    (
                        "Trade-offs",
                        """- **OCP is not free.** You buy extension with indirection, and you must guess the axis of change correctly. Guessing wrong gives you an abstraction that blocks the change that actually arrives.
- **Closed for modification is an ideal, not a rule.** Registries, config and wiring still change. Aim for the tested logic being closed, not literally every file.
- **Honouring Liskov can force wider contracts.** Returning a result type instead of throwing pushes handling onto every caller. That is more code and fewer surprises.
- **Capability interfaces multiply types.** `Flying`, `Swimming`, `Refundable` is more precise and more to read. Split when an implementation genuinely cannot honour a method, not on principle.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Treating OCP as "never edit any file", which is impossible
- Building an extension point before the second implementation exists
- Overriding a method to throw `UnsupportedOperationException` and calling it inheritance
- Strengthening a precondition in a subtype, which is the violation people miss
- Using `instanceof` in a caller to work around a subtype that does not fit
- Explaining square and rectangle without mentioning that mutability is the actual culprit""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"Why is `Square extends Rectangle` wrong?"** Because a caller that sets width then height expects both to hold independently. `Square` cannot honour that, so it weakens a postcondition. With immutable types the problem disappears, which shows the real cause is mutation, not the shapes.

**"How do you detect an LSP violation in review?"** Search for `UnsupportedOperationException`, for empty overrides, and for `instanceof` in callers. Each one means some subtype does not fit the contract.

**"Can a subtype throw a new exception?"** An unchecked one, in genuinely exceptional cases, yes. A new checked exception, no — callers compiled against the parent cannot handle it, so it breaks substitutability.

**"Is it always worth being open for extension?"** No. If the variant set is closed — the seven days of the week — a switch over a sealed type is clearer and the compiler checks exhaustiveness for you.""",
                    ),
                    (
                        "Interview Tip",
                        """When you propose an extension point, state the axis you are betting on. It shows you know the bet can be lost.

> "I am making shipping method an interface because the roadmap is more carriers. If instead the change turns out to be more things you can compute about a shipment, this abstraction is the wrong one and a sealed type with pattern matching would fit better."

That single sentence demonstrates OCP, the risk of guessing wrong, and awareness of the alternative — three signals for the price of one.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Find the Liskov violation and propose two fixes.

```java
abstract class Account {
    abstract void withdraw(Money amount);   // contract: succeeds if balance covers the amount
}

class FixedDepositAccount extends Account {
    void withdraw(Money amount) {
        if (LocalDate.now().isBefore(maturityDate)) {
            throw new IllegalStateException("locked until maturity");
        }
    }
}
```

Then answer the follow-up: which of your two fixes would you pick if there were already forty callers of `withdraw` in production?""",
                    ),
                ],
                [
                    "OCP: adding a variant should create a file, not a diff in tested code.",
                    "LSP in one line: a subtype may ask for less and promise more, never the reverse.",
                    "UnsupportedOperationException, empty overrides and caller instanceof are the three LSP tells.",
                    "The square/rectangle problem is caused by mutability, not by geometry.",
                    "Name the axis of change you are betting on when you introduce an extension point.",
                ],
                [
                    "Why does Square extends Rectangle break Liskov?",
                    "How would you spot an LSP violation in code review?",
                    "May a subtype throw an exception the parent does not?",
                    "When is a switch better than an open/closed extension point?",
                ],
            ),
            OD(
                "interface-segregation-and-dip",
                "Interface Segregation and Dependency Inversion",
                "Small client-shaped interfaces, and pointing dependencies at abstractions your own module owns.",
                12,
                "The last two principles are about who owns a contract. Interface segregation says the client should shape the interface, not the implementer. Dependency inversion says the high-level policy should own the abstraction its low-level details implement. Together they explain almost every good package layout you have seen, and why so many bad ones import a database driver into business logic.",
                [
                    (
                        "Why It Matters",
                        """These two are the principles that decide whether your code can be tested and whether your modules can be reused.

ISP failures show up as empty method bodies: a class implements a ten-method interface and genuinely needs three. Every implementer now pays for methods it does not use, and every change to the fat interface ripples to classes that never cared.

DIP failures show up as an import. When `OrderService` imports `com.stripe.Stripe`, the business rule now depends on a vendor. You cannot test it without a network, you cannot reuse it with another gateway, and the vendor's release schedule is now yours.

> Memory cue: ISP is about interface size. DIP is about which direction the arrow points and who owns the interface file.""",
                    ),
                    (
                        "Mental Model",
                        """**ISP:** no client should be forced to depend on methods it does not use. Interfaces belong to callers, so they are named for what the caller wants.

**DIP:** high-level modules should not depend on low-level modules; both should depend on abstractions. And the crucial second half people skip — **the abstraction belongs to the high-level module.**

| | Without DIP | With DIP |
| --- | --- | --- |
| Arrow | `OrderService` → `StripeGateway` | `OrderService` → `PaymentGateway` ← `StripeGateway` |
| Interface lives in | The vendor adapter package | The domain package |
| Testing needs | Network, API key | A fake class |
| Swapping vendors | Edit the service | Add a class, change wiring |

The inversion in the name is exactly this: the dependency arrow used to point from policy to detail, and now it points from detail to policy.""",
                    ),
                    (
                        "How It Works",
                        """### Fat interfaces produce empty methods

```java
interface Worker {
    void work();
    void eat();
    void sleep();
    void attendStandup();
}

class RobotWorker implements Worker {
    public void work() { ... }
    public void eat() { }              // meaningless
    public void sleep() { }            // meaningless
    public void attendStandup() { }    // meaningless
}
```

Three empty bodies is the signal. Split by capability:

```java
interface Workable { void work(); }
interface Feedable { void eat(); }
```

The realistic version of this is a `Repository` interface with fifteen methods where a given caller uses two. That interface forces every test double to stub fifteen methods, which is why teams reach for mocking frameworks to paper over a design problem.

### Role interfaces beat header interfaces

A **header interface** mirrors one class's public methods — `UserService` and `UserServiceImpl`. It provides no decoupling; it is the class's shape with a different name.

A **role interface** is named for what a caller needs and is usually tiny.

```java
// Header interface: invented by the implementer, useless to callers.
interface UserServiceImpl_Interface { /* 14 methods mirroring the class */ }

// Role interfaces: invented by each caller, named for the need.
interface FindsUserByEmail { Optional<User> byEmail(EmailAddress email); }
interface RecordsLastLogin { void recordLogin(UserId id, Instant at); }
```

One class can implement several role interfaces. Each caller depends on the one it needs, so a change to login recording cannot break the class that only looks users up. When an interviewer asks how to avoid a fat repository, this is the answer.

### DIP is about where the file lives

This is the part candidates miss. Creating an interface is not dependency inversion if the interface lives with the implementation.

```
domain/
  Order.java
  PaymentGateway.java      <- the interface, owned by the domain
  Checkout.java
adapters/
  StripeGateway.java       <- implements domain.PaymentGateway
  PaypalGateway.java
```

Now `domain` compiles with no knowledge that Stripe exists, and `adapters` depends on `domain`. The arrow points inward. You can ship `domain` as a library, test it with a five-line fake, and add a gateway without recompiling a single business rule.

If instead `PaymentGateway` sits in the adapters package, `domain` still imports `adapters`, and you have an interface without an inversion.

### Wiring has to happen somewhere

Both principles push knowledge of concrete types to one place — the composition root, usually `main` or a configuration class. That is the trade: one file knows everything, so that no other file has to.""",
                    ),
                    (
                        "Example",
                        """A notification service, inverted.

```java
// domain package - no vendor names anywhere in here
public interface Notifier {
    void notifyUser(UserId user, Message message);
}

public final class OrderShipped {
    private final Notifier notifier;
    private final Orders orders;

    public OrderShipped(Notifier notifier, Orders orders) {
        this.notifier = notifier;
        this.orders = orders;
    }

    public void handle(OrderId id) {
        Order order = orders.require(id);
        notifier.notifyUser(order.customerId(), Message.shipped(order));
    }
}
```

```java
// adapters package - depends on domain, never the other way round
public final class TwilioSmsNotifier implements Notifier {
    public void notifyUser(UserId user, Message message) { /* Twilio SDK */ }
}
```

```java
// composition root - the only file that knows both sides exist
Notifier notifier = new TwilioSmsNotifier(twilioClient);
OrderShipped handler = new OrderShipped(notifier, jdbcOrders);
```

The test for `OrderShipped` is now three lines and needs no network:

```java
var sent = new ArrayList<Message>();
new OrderShipped((user, msg) -> sent.add(msg), fakeOrders).handle(orderId);
assertEquals(1, sent.size());
```

That the fake fits in a lambda is not a coincidence — it is what a properly segregated interface buys you.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Any LLD problem that touches an external system: payments, email, storage, geolocation
- Designing a package or module structure when the interviewer asks for more than classes
- Explaining how you would test a class that currently calls a static database helper
- Hexagonal, ports-and-adapters and clean architecture questions, which are DIP applied at module scale""",
                    ),
                    (
                        "Trade-offs",
                        """- **Many small interfaces means many files.** Role interfaces are precise and numerous. A reader has to assemble the picture from several names.
- **DIP adds a layer even when there is one implementation.** For a genuinely stable dependency — `java.time`, a maths library — inverting buys nothing and costs a hop.
- **The composition root becomes large.** Wiring concentrates, and in a big system it becomes its own thing to maintain. A DI container trades explicitness for size.
- **Over-inversion hides the real flow.** When every collaborator is an interface, reading the code no longer tells you what runs. Invert across boundaries you actually want to defend.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Declaring an interface in the same package as its only implementation and calling it DIP
- `XxxService` plus `XxxServiceImpl` with a one-to-one method mapping, which decouples nothing
- Fat repository interfaces that force every test to stub methods it never calls
- Business logic importing a vendor SDK, an ORM annotation, or a servlet type
- Implementing an interface with empty methods rather than splitting it
- Creating an interface for every class as a policy instead of at a boundary""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"Is creating an interface the same as dependency inversion?"** No. Inversion requires the abstraction to be owned by the high-level module. An interface that ships with its implementation leaves the arrow pointing the same way.

**"What is wrong with `UserService` and `UserServiceImpl`?"** It is a header interface — the implementation's shape with a second name. It adds a file and removes no coupling. Interfaces should be named for what a caller needs.

**"How does ISP relate to testing?"** Directly. Small interfaces mean small fakes. When a test has to stub twelve methods to exercise one, that is an ISP violation showing up as pain.

**"Where do you draw the line on inverting dependencies?"** At boundaries I want to defend: anything over a network, anything vendor-specific, anything slow or non-deterministic like a clock or a random source. Not at stable standard-library types.""",
                    ),
                    (
                        "Interview Tip",
                        """Show DIP by drawing packages, not classes. It takes ten seconds and demonstrates a level of thinking most candidates skip.

> "I will put `Order` and the `PaymentGateway` interface in the domain package, with no vendor imports at all. Stripe goes in an adapters package that depends on domain. Main wires them. That way the business rules are testable with a lambda and adding PayPal never touches domain code."

If the interviewer follows with "why does the interface live in domain?", you already have the answer: so the arrow points inward.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Invert this class. Say which package each resulting type belongs to and write the one-line fake you would use in a test.

```java
class ReportJob {
    void run() {
        var rows = new MySqlConnection("jdbc:mysql://prod/db").query("SELECT ...");
        var csv = new CsvWriter().write(rows);
        new S3Client(System.getenv("AWS_KEY")).put("reports/daily.csv", csv);
        new SlackClient().post("#ops", "report ready at " + LocalDateTime.now());
    }
}
```

You are done when `ReportJob` names no vendor, takes its collaborators in a constructor, and can be tested without touching a network or the system clock.""",
                    ),
                ],
                [
                    "ISP: an interface belongs to its caller and is named for what the caller needs.",
                    "Empty method bodies and twelve-method test stubs are ISP violations surfacing.",
                    "DIP is not just an interface — the high-level module must own the interface file.",
                    "Invert at boundaries worth defending: network, vendor, clock, randomness.",
                    "Wiring concentrates in one composition root so no other file knows concrete types.",
                ],
                [
                    "Is adding an interface the same thing as dependency inversion?",
                    "What is wrong with Service plus ServiceImpl?",
                    "How does interface segregation show up as testing pain?",
                    "Which dependencies would you not bother inverting?",
                ],
            ),
        ],
    )


def _design_heuristics_topic() -> dict:
    return _ood_topic(
        "design-heuristics",
        "Design Heuristics & Code Smells",
        "Tell-don't-ask, the law of Demeter, DRY/YAGNI/KISS, and the smells that tell you which refactoring to reach for.",
        "MEDIUM",
        4,
        [
            OD(
                "design-heuristics",
                "Design Heuristics",
                "The rules of thumb that fill the gap between SOLID and an actual decision.",
                12,
                "SOLID tells you what a good design has. Heuristics tell you what to do next when you are staring at a method. These four — tell don't ask, the law of Demeter, DRY and YAGNI — come up constantly in code review questions, and each one has a limit that a good candidate can state.",
                [
                    (
                        "Why It Matters",
                        """Interviewers rarely ask "what is the law of Demeter?" They hand you code and ask what you would change. The heuristics are how you produce a specific answer instead of a vague one.

They also protect you from the opposite failure. A candidate who applies DRY to everything ends up coupling two modules that merely looked similar; a candidate who has never heard of YAGNI builds a plugin architecture for a feature nobody asked for. Knowing the limit of each rule is the part that reads as senior.

> Memory cue: heuristics are defaults, not laws. The interview points are in knowing when to break them.""",
                    ),
                    (
                        "Mental Model",
                        """Four heuristics, each with the smell it detects and the limit where it stops applying.

| Heuristic | Detects | Stop applying when |
| --- | --- | --- |
| **Tell, don't ask** | Getters feeding a decision the object could make | The caller genuinely orchestrates several objects |
| **Law of Demeter** | Chained calls through objects you do not own | Fluent builders and streams, which are one object by design |
| **DRY** | The same *knowledge* in two places | The duplication is coincidental, not conceptual |
| **YAGNI** | Abstractions built for imagined futures | The change is certain and the cost of retrofitting is high |""",
                    ),
                    (
                        "How It Works",
                        """### Tell, don't ask

If you fetch state from an object to make a decision about that object, the decision belongs inside it.

```java
// Asking: the rule lives in the caller, and will be copy-pasted to the next caller.
if (account.getBalance() >= amount && !account.isFrozen()) {
    account.setBalance(account.getBalance() - amount);
}

// Telling: the rule has one home and cannot be bypassed.
account.withdraw(amount);
```

The second version can enforce invariants, log, and throw a domain-specific exception. The first version cannot, because the decision already happened outside.

The limit: a caller that coordinates several objects has to ask some of them things. `if (cart.isEmpty()) return;` is fine. The smell is asking for state and then writing the object's own rule.

### Law of Demeter — talk to friends, not strangers

```java
// Reaches through three objects. Any of them changing shape breaks this line.
order.getCustomer().getAddress().getCountry().getTaxRate();

// The order exposes what the caller actually needs.
order.taxRate();
```

The rule of thumb: a method may call methods on itself, its own fields, its parameters, and objects it creates. Anything further is coupling to a structure you do not control.

The exception people miss: fluent APIs. `builder.name("x").age(3).build()` returns the same object each time, so nothing is being reached through. Streams are the same. Say this if an interviewer challenges you — a candidate who applies Demeter to a builder is applying it mechanically.

### DRY is about knowledge, not text

The common misreading is "never write similar code twice". The real rule is that a piece of *knowledge* should have one authoritative home.

```java
// Same shape, different knowledge - do NOT merge these.
boolean isEligibleForDiscount(User u) { return u.age() >= 65; }
boolean requiresGuardianConsent(User u) { return u.age() >= 65; }
```

They look identical today. They are unrelated rules, and the day the discount threshold moves to 60 you will be glad they were separate. Merging coincidental duplication creates coupling between things that have no reason to change together — a worse problem than the duplication it removed.

The genuinely DRY violation is the same rule in three places:

```java
if (order.total() > 10000) { ... }   // in checkout
if (o.total() > 10000) { ... }        // in fraud review
if (amount > 10000) { ... }           // in the export job
```

That belongs in one named place — `Order.requiresManualReview()` — because it is one rule.

### YAGNI and its limit

Do not build the abstraction for the second implementation until the second implementation exists. Most speculative extension points are wrong, because you guessed the axis of change before you had evidence.

The limit: some decisions are expensive to reverse. A database schema, a public API shape, an event format written to a log others consume. For those, thinking one step ahead is cheap insurance. The distinction to state in an interview is **reversible versus irreversible** — be liberal with the first and careful with the second.""",
                    ),
                    (
                        "Example",
                        """One method, four heuristics applied in order.

```java
// Before
class ShippingCalculator {
    Money calculate(Order order) {
        String country = order.getCustomer().getAddress().getCountry();   // Demeter
        Money subtotal = Money.ZERO;
        for (Item i : order.getItems()) subtotal = subtotal.plus(i.getPrice());  // tell-don't-ask
        if (subtotal.greaterThan(Money.of(100))) return Money.ZERO;       // DRY: this threshold is everywhere
        if (country.equals("US")) return Money.of(5);
        return Money.of(15);
    }
}
```

```java
// After
class ShippingCalculator {
    Money calculate(Order order) {
        if (order.qualifiesForFreeShipping()) return Money.ZERO;   // the order knows its own rule
        return rates.forCountry(order.shippingCountry());          // one hop, no chain
    }
}
```

Three changes, each traceable to a heuristic: the country chain collapsed into one method on `Order`; the subtotal loop moved inside the order; and the free-shipping threshold became a named rule with one home. YAGNI shows up as what is *absent* — no `ShippingStrategy` interface, because there is exactly one rate table today.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Code review questions where the interviewer wants specific, named critiques
- Refactoring an anaemic model during an LLD problem
- Deciding whether two similar-looking methods should be merged
- Justifying what you deliberately did not build, which is its own strong signal""",
                    ),
                    (
                        "Trade-offs",
                        """- **Tell-don't-ask can inflate an object's interface.** Every caller need becomes a method. At some point a query method returning data is the honest answer.
- **Demeter can produce wrapper methods that only delegate.** A chain of one-line pass-throughs is its own smell. Apply it where the intermediate structure is volatile.
- **DRY applied to coincidental duplication couples unrelated code.** Prefer duplication over the wrong abstraction — you can always merge later, and unpicking a bad merge is much harder.
- **YAGNI fights with irreversible decisions.** Schemas, wire formats and public APIs deserve forethought that internal classes do not.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Treating DRY as a ban on similar-looking code
- Applying the law of Demeter to builders and streams, where it does not apply
- Adding a getter for every field and calling the object well encapsulated
- Building a strategy interface for one implementation and calling it future-proof
- Quoting heuristics as absolute laws with no stated limit
- Removing duplication by extracting a method with four boolean parameters""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"Is duplication always bad?"** No. Duplicated knowledge is bad; duplicated text that represents two independent rules is fine and often better. The wrong abstraction costs more than the duplication it removed.

**"Does the law of Demeter apply to a builder?"** No. A fluent builder returns itself, so there is no reaching through a stranger. The rule targets coupling to someone else's object graph.

**"When would you break YAGNI deliberately?"** For hard-to-reverse decisions — a persisted schema, an event format, a public API. There, a small amount of forethought is much cheaper than a migration.

**"Give me a tell-don't-ask violation from your own code."** Have a real one. Fetching a status enum and switching on it in the caller is the most common form.""",
                    ),
                    (
                        "Interview Tip",
                        """Name the heuristic, apply it, and state its limit. Three beats, fifteen seconds.

> "This is tell-don't-ask: we are pulling the balance out to make a decision that the account should be making. I would move it to `account.withdraw()`. I would not push *everything* in — the caller still coordinates the transfer between two accounts, and that coordination genuinely belongs outside either one."

The limit clause is what stops the interviewer worrying that you apply rules mechanically.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Find one violation of each heuristic in this snippet and give the fix.

```java
void process(Booking b) {
    if (b.getUser().getAccount().getStatus().equals("ACTIVE")) {
        double fee = b.getSeats().size() * 2.5;
        if (fee > 50) fee = 50;
        b.setFee(fee);
        auditRepo.save(new Audit("booking", b.getId(), new Date(), null, null, null));
    }
}
```

Then justify one thing you would deliberately leave alone, and say why.""",
                    ),
                ],
                [
                    "Tell, don't ask: if you fetch state to decide about an object, the decision belongs inside it.",
                    "Demeter targets coupling to someone else's object graph, not fluent APIs.",
                    "DRY protects duplicated knowledge; duplicated text of independent rules is fine.",
                    "Prefer duplication to the wrong abstraction — merging later is easy, unpicking is not.",
                    "Apply YAGNI to reversible decisions and forethought to irreversible ones.",
                ],
                [
                    "Is duplication always a problem?",
                    "Does the law of Demeter forbid method chaining?",
                    "When would you knowingly break YAGNI?",
                    "Show me a tell-don't-ask violation and its fix.",
                ],
            ),
            OD(
                "code-smells-and-refactoring",
                "Code Smells & Refactoring Moves",
                "A named catalogue of smells, each paired with the specific refactoring that removes it.",
                12,
                "Interviewers hand candidates bad code and watch. The difference between a weak and a strong response is vocabulary: 'this feels messy' scores nothing, while 'this is feature envy, I would move the method to the class it keeps asking' scores immediately. This lesson is that vocabulary, with the fix attached to each name.",
                [
                    (
                        "Why It Matters",
                        """Refactoring questions appear in three forms and all three reward naming.

- **Code review:** "what would you change here?"
- **Design evolution:** "the requirements just changed — how does your design absorb it?"
- **Experience probes:** "tell me about a refactoring you did." A named smell and a named move make that story concrete.

Naming also makes you faster. If you recognise a long parameter list, you do not have to invent a solution — introduce a parameter object, done. The catalogue converts design judgement into recall, which is what you want under time pressure.""",
                    ),
                    (
                        "Mental Model",
                        """Each smell has a standard move. Learn them as pairs.

| Smell | What you see | The move |
| --- | --- | --- |
| **Long method** | Fifty lines, several blank-line "paragraphs" | Extract method, one per paragraph |
| **Large class** | Many fields, disjoint method groups | Extract class along field usage |
| **Long parameter list** | Five or more parameters, several booleans | Introduce parameter object; split on booleans |
| **Feature envy** | A method using another object's data more than its own | Move method to that class |
| **Data clumps** | The same three values travel together everywhere | Extract a value object |
| **Primitive obsession** | String and long for domain concepts | Introduce a typed value |
| **Switch on type** | A conditional that grows with features | Replace conditional with polymorphism |
| **Shotgun surgery** | One change edits eight files | Move related behaviour together |
| **Divergent change** | One class changes for many reasons | Split by reason to change |
| **Temporal coupling** | Setters that must be called in order | Constructor or builder with validation |
| **Message chain** | `a.getB().getC().getD()` | Hide delegate, or expose what the caller needs |
| **Speculative generality** | Interfaces with one implementation, unused hooks | Inline and delete |

Shotgun surgery and divergent change are opposites and worth keeping straight: one change touching many classes versus many changes touching one class.""",
                    ),
                    (
                        "How It Works",
                        """### Feature envy — the highest-value one to spot

```java
class ReportPrinter {
    String format(Invoice invoice) {
        return invoice.getCustomerName()
             + " " + invoice.getSubtotal()
             + " " + invoice.getTax()
             + " " + invoice.getTotal();
    }
}
```

Every line reaches into `Invoice`. The method envies that class's data. Move it:

```java
class Invoice {
    String summaryLine() { ... }   // now the data never leaves
}
```

Spotting this is worth practising because the fix is mechanical and the improvement is obvious to the interviewer.

### Data clumps become value objects

```java
// These three always travel together.
void book(String city, String postcode, String country, LocalDate from, LocalDate to) { }

// Two value objects, and the signature now documents itself.
void book(Address address, DateRange stay) { }
```

`DateRange` can also validate that `from` is before `to` — a rule that was previously repeated at every call site or, more likely, nowhere.

### Long parameter list with booleans

```java
// Callers read as save(order, true, false, true) at the call site. Unreadable.
void save(Order order, boolean validate, boolean notify, boolean async) { }

// Named intent instead.
void save(Order order) { }
void validateAndSave(Order order) { }
void saveAsync(Order order) { }
```

If the combinations genuinely multiply, an options object with a builder is the honest answer — but check first whether three of the eight combinations are actually nonsense, in which case they should not be expressible at all.

### Refactoring safely

State the discipline, not just the destination. The interviewer wants to hear that you know how to change code without breaking it:

1. Make sure a test covers the current behaviour. If it does not, add a characterisation test first.
2. Make one named move.
3. Run the tests.
4. Commit.

"I would add a characterisation test before touching it" is a sentence that marks experience, because it is what you learn after breaking something.""",
                    ),
                    (
                        "Example",
                        """A method with four smells, named and fixed in sequence.

```java
class OrderProcessor {
    void process(Order o, boolean express, boolean giftWrap, boolean notify) {   // long param list
        double total = 0;
        for (Line l : o.getLines()) total += l.getQty() * l.getUnitPrice();      // feature envy
        if (o.getCustomer().getAddress().getCountry().equals("US")) total *= 1.07; // message chain
        if (express) total += 20;
        if (giftWrap) total += 5;
        o.setTotal(total);
        if (notify) email.send(o.getCustomer().getEmail(), "Order", "Total: " + total);
    }
}
```

The sequence of moves:

1. **Feature envy** → move the line-total loop into `Order.subtotal()`.
2. **Message chain** → add `Order.shippingCountry()` so the processor stops walking the graph.
3. **Long parameter list with booleans** → replace with an `OrderOptions` value object, or with two explicit methods if only two combinations are real.
4. **Temporal coupling** → `setTotal` after construction means an order exists in a state with no total. Compute the total on demand instead.

The result is a processor that orchestrates and an order that knows its own arithmetic — which is also just tell-don't-ask arriving from a different direction.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Code review rounds, which are now standard at several large companies
- The second half of an LLD interview, when requirements change and your design has to absorb it
- Behavioural questions about improving a codebase
- Reading unfamiliar code aloud, where naming smells shows you are actually evaluating it""",
                    ),
                    (
                        "Trade-offs",
                        """- **Extracting methods can hide the flow.** Twelve three-line private methods can be harder to follow than one readable thirty-line method. Extract at genuine conceptual boundaries.
- **Value objects add types.** `DateRange` is another class to know. Worth it when the clump appears three or more times or carries a validation rule.
- **Refactoring without tests is gambling.** If there is no coverage, the first move is a characterisation test, not a change.
- **Some smells are the least-bad option.** A long switch in a parser or a state table can be the clearest possible code. Name the smell, then say why you are leaving it.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Saying code is "messy" without naming a specific smell
- Extracting methods until the logic is scattered across a dozen private helpers
- Introducing a parameter object that is just the same five fields with a new name
- Refactoring and adding a feature in the same step, so a failure has two possible causes
- Removing every conditional on principle, including the ones that were clear
- Proposing a rewrite when a sequence of safe moves would do""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"What is feature envy?"** A method that uses another class's data more than its own. The fix is to move the method to the class whose data it keeps asking for.

**"Difference between shotgun surgery and divergent change?"** Shotgun surgery is one change forcing edits in many classes — behaviour is too spread out. Divergent change is one class changing for many unrelated reasons — it has too many responsibilities. Opposite problems, opposite fixes.

**"How do you refactor safely with no tests?"** Write characterisation tests that pin current behaviour, including any bugs. Then refactor in small steps, running tests after each one.

**"When would you leave a smell in place?"** When the fix costs more than the smell — a stable long switch nobody edits, or duplication between two modules that are genuinely independent.""",
                    ),
                    (
                        "Interview Tip",
                        """Name the smell, name the move, then say what it buys. Do it three times in a code review and you have effectively finished the round.

> "Two things stand out. This is feature envy — `format` only touches invoice data, so I would move it onto `Invoice` and the getters disappear. And these four parameters are a data clump that always travel together; I would extract an `Address` value object, which also gives postcode validation one home instead of four."

Compare that with "I would clean this up a bit". Same instinct, completely different score.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Name every smell in this class, then order your fixes by value and say why that order.

```java
class UserAccountManager {
    void doWork(User u, int mode, boolean force, String extra) {
        if (mode == 1) { /* 40 lines of registration */ }
        else if (mode == 2) { /* 35 lines of password reset */ }
        else if (mode == 3) { /* 50 lines of deletion */ }
    }
}
```

You should find at least four named smells. Then answer: what is the very first thing you do before changing any of it?""",
                    ),
                ],
                [
                    "Name the smell and its standard move; vague critique scores nothing.",
                    "Feature envy is the highest-value smell to spot because the fix is mechanical.",
                    "Data clumps become value objects that also give validation one home.",
                    "Shotgun surgery spreads one change; divergent change overloads one class.",
                    "With no tests, the first refactoring move is a characterisation test.",
                ],
                [
                    "What is feature envy and how do you fix it?",
                    "Shotgun surgery versus divergent change — what is the difference?",
                    "How do you refactor code that has no tests?",
                    "When would you deliberately leave a smell in place?",
                ],
            ),
        ],
    )


def _composition_topic() -> dict:
    return _ood_topic(
        "composition-vs-inheritance",
        "Composition vs Inheritance",
        "The most common design fork in an LLD interview, plus delegation, mixins and how to unwind an inheritance hierarchy that has gone wrong.",
        "MEDIUM",
        5,
        [
            OD(
                "composition-vs-inheritance",
                "Composition vs Inheritance",
                "When is-a is true, when it only looks true, and what inheritance costs that composition does not.",
                13,
                "\"Favour composition over inheritance\" is the most quoted line in object-oriented design and the least explained. This lesson covers why the default exists, the three questions that decide a specific case, and the exponential class explosion that is the strongest argument against subclassing for variation.",
                [
                    (
                        "Why It Matters",
                        """Inheritance is the only tool in the language that couples two classes at compile time in a way you cannot later intercept. A subclass sees protected state, depends on the parent's call order, and breaks when the parent refactors internally. That last one has a name — the fragile base class problem — and it is why large frameworks are so conservative about changing superclasses.

Composition has none of those properties. The composed object is reached through a reference you control, can be swapped at runtime, faked in a test, and changed without recompiling the holder.

In an interview, this shows up as a fork you must take explicitly. The interviewer says "we also need express delivery", and your answer is either a subclass or a field. Which one you choose, and whether you can defend it, is the whole question.

> Memory cue: inheritance is a compile-time promise about identity. Composition is a runtime choice about behaviour.""",
                    ),
                    (
                        "Mental Model",
                        """Three questions. All three must be yes for inheritance.

1. **Is it genuinely is-a?** Would a domain expert say a `SavingsAccount` *is an* `Account`? If you are reaching for inheritance because the parent has a useful method, the answer is no.
2. **Is the subtype substitutable?** Can you pass it anywhere the parent works without surprising the caller? If any method would throw or no-op, the answer is no.
3. **Is the variation on one axis?** Inheritance gives you one hierarchy. If things vary along two independent axes, subclassing multiplies.

| | Inheritance | Composition |
| --- | --- | --- |
| Bound at | Compile time | Runtime |
| Relationship | is-a | has-a |
| Reuse mechanism | Inherit members | Delegate to a field |
| Testing | Must construct the parent too | Inject a fake |
| Changing behaviour later | New subclass, recompile | Swap the field |
| Multiple axes of variation | Class explosion | One field per axis |""",
                    ),
                    (
                        "How It Works",
                        """### The class explosion argument

This is the most persuasive thing you can say, because it is arithmetic rather than taste.

Suppose a coffee shop has drinks that vary by size and by milk. With inheritance:

```
SmallLatte, MediumLatte, LargeLatte,
SmallOatLatte, MediumOatLatte, LargeOatLatte,
SmallSoyLatte, ...
```

Three sizes times three milks is nine classes for one drink. Add decaf and it is eighteen. The count is the product of the axes.

With composition it is the sum:

```java
final class Drink {
    private final Base base;      // latte, americano
    private final Size size;      // small, medium, large
    private final Milk milk;      // dairy, oat, soy
    private final boolean decaf;
}
```

Three fields, and adding almond milk is one enum constant rather than three new classes. When an interviewer asks "why composition?", give them the multiplication.

### Inheritance breaks encapsulation

A subclass depends on things the parent never promised.

```java
class CountingList<E> extends ArrayList<E> {
    private int added = 0;

    @Override public boolean add(E e) { added++; return super.add(e); }
    @Override public boolean addAll(Collection<? extends E> c) {
        added += c.size();
        return super.addAll(c);        // ArrayList.addAll internally calls add()
    }
}
```

`addAll` double-counts, because `ArrayList.addAll` happens to call `add`. Nothing in the documentation promised that, and nothing stops a future JDK release from changing it. The subclass is coupled to the parent's *implementation*, not its interface.

The composed version cannot have this bug:

```java
final class CountingList<E> {
    private final List<E> delegate = new ArrayList<>();
    private int added = 0;

    boolean add(E e) { added++; return delegate.add(e); }
    boolean addAll(Collection<? extends E> c) { added += c.size(); return delegate.addAll(c); }
}
```

### When inheritance is right

It is not always wrong, and saying so keeps you credible.

- **Genuine taxonomy with shared contract:** `IOException extends Exception`.
- **Template method:** the parent owns an algorithm's skeleton and subclasses fill named steps. The parent controls the call order, so fragility is bounded.
- **Framework extension points:** when a library gives you an abstract class to extend, extend it.
- **Sealed hierarchies:** a closed set of variants where you want exhaustiveness checking.

The common thread: inheritance works when the parent was *designed* to be extended, with the extension points named. Extending a class that was not designed for it is where the trouble starts — which is why Java lets you mark classes `final`, and why the default in modern codebases is to do so.""",
                    ),
                    (
                        "Example",
                        """A logging requirement, done both ways.

```java
// Inheritance: one subclass per combination, and you cannot mix them.
class Repository { void save(Order o) { ... } }
class LoggingRepository extends Repository { }
class CachingRepository extends Repository { }
class CachingLoggingRepository extends ??? // pick a parent and duplicate the other
```

```java
// Composition: each concern is a wrapper, and they stack in any order.
interface Repository { void save(Order o); }

final class LoggingRepository implements Repository {
    private final Repository delegate;
    public void save(Order o) {
        log.info("saving {}", o.id());
        delegate.save(o);
    }
}

final class CachingRepository implements Repository {
    private final Repository delegate;
    public void save(Order o) { cache.put(o.id(), o); delegate.save(o); }
}

Repository repo = new LoggingRepository(new CachingRepository(new JdbcRepository(ds)));
```

The composed version supports every combination, in any order, chosen at runtime. This is the decorator pattern, and it exists precisely because inheritance could not do this job.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Any LLD prompt where variants multiply: drinks, pricing, vehicles, notifications
- Adding a cross-cutting concern — logging, caching, retry, metrics — around an existing type
- Unwinding an existing deep hierarchy that the interviewer hands you
- Explaining why you marked a class `final` """,
                    ),
                    (
                        "Trade-offs",
                        """- **Composition needs delegation code.** Wrapping a ten-method interface means writing ten pass-through methods. Java has no `by` keyword to generate them, and that boilerplate is a real cost.
- **Inheritance is more concise when it fits.** For a genuine two-level taxonomy with shared state, a superclass is less code than a field plus delegation.
- **Composition adds an indirection to read.** A stack of three decorators means three files to step through in a debugger.
- **Interface default methods blur the line.** They give shared behaviour without state and without a superclass. Useful, but keep them thin — a default method with real logic is a superclass in disguise.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Extending a class because it has a method you want to reuse
- Extending a concrete collection like `ArrayList` rather than wrapping it
- Building a hierarchy that multiplies along two axes and only noticing at class nine
- Saying "favour composition" without being able to give the class-explosion argument
- Claiming inheritance is always wrong, which is not true and reads as dogma
- Overriding a method to no-op, which is a Liskov violation wearing a reuse costume""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"Why favour composition?"** Runtime flexibility, testability, and the class count. Inheritance multiplies classes across axes of variation; composition adds a field per axis. Composition also survives a parent's internal refactor, which inheritance does not.

**"When is inheritance still the right call?"** True taxonomies, template method, framework extension points, and sealed hierarchies — all cases where the parent was designed for extension and controls the call order.

**"What is the fragile base class problem?"** A subclass depends on the parent's internal call sequence, so a harmless-looking change inside the parent breaks the subclass. The `CountingList` double-count is the classic demonstration.

**"How do you refactor a deep hierarchy?"** Find the axes of variation, turn each into a field with a small interface, collapse the hierarchy to one class with those fields, then delete the subclasses one at a time with tests in between.""",
                    ),
                    (
                        "Interview Tip",
                        """Use the arithmetic. It converts a matter of taste into a fact the interviewer cannot argue with.

> "If I subclass for size and milk type, that is three times three — nine classes for one drink, and eighteen once decaf arrives. If I compose, it is three fields and adding almond milk is one enum constant. So I will compose, and keep inheritance for the genuine `Drink` versus `Food` split where substitutability actually holds."

You have picked a side, justified it numerically, and shown you still know when the other side wins.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """A game has characters that vary by weapon (sword, bow, staff), by armour (light, heavy, none) and by movement (walk, fly, swim).

1. How many classes does an inheritance-based design need?
2. Sketch the composed version.
3. Now the requirement arrives: a character can change weapon mid-game. What does each design have to do?

The third question is the one that decides it.""",
                    ),
                ],
                [
                    "Inheritance multiplies classes across axes; composition adds one field per axis.",
                    "A subclass couples to the parent's implementation, not just its interface.",
                    "Composition can be swapped at runtime and faked in a test; inheritance cannot.",
                    "Inheritance is right when the parent was designed for extension and owns the call order.",
                    "The class-explosion arithmetic is the most persuasive argument you can give.",
                ],
                [
                    "Why favour composition over inheritance?",
                    "When is inheritance still the correct choice?",
                    "Explain the fragile base class problem with an example.",
                    "How would you unwind a four-level inheritance hierarchy?",
                ],
            ),
            OD(
                "delegation-and-mixins",
                "Delegation & Behaviour Sharing",
                "Delegation, default methods, sealed types and the Java tools for sharing behaviour without a superclass.",
                11,
                "Once you have decided to compose rather than inherit, a practical question follows: how do you share behaviour between classes that are not related by a superclass? Java gives you delegation, interface default methods, static helpers and sealed hierarchies. Each has a right use and a way of being abused.",
                [
                    (
                        "Why It Matters",
                        """The follow-up to "favour composition" is always "then how do you avoid duplicating the shared code?". A candidate who cannot answer that has only half the argument.

There is also a Java-specific trap here. Default methods on interfaces look like multiple inheritance and are frequently misused as a way to smuggle a superclass in. Knowing why they exist — and why they cannot hold state — is a common senior-level Java question.

> Memory cue: interfaces can share behaviour but never state. That single rule explains what default methods can and cannot do.""",
                    ),
                    (
                        "Mental Model",
                        """Four mechanisms, ordered by how much they couple.

| Mechanism | Shares | Holds state | Use when |
| --- | --- | --- | --- |
| **Static helper** | Pure functions | No | Stateless utility: parsing, formatting, maths |
| **Delegation to a field** | Anything | Yes, in the delegate | The default answer for reuse |
| **Interface default method** | Behaviour derived from other interface methods | No | A convenience method every implementer would write identically |
| **Abstract class** | Behaviour plus state | Yes | Template method, when you control the whole hierarchy |

The order matters: reach for the top of the table first and only move down when you need what the next row adds.""",
                    ),
                    (
                        "How It Works",
                        """### Delegation is composition with forwarding

```java
final class RetryingGateway implements PaymentGateway {
    private final PaymentGateway delegate;
    private final int attempts;

    public Receipt charge(PaymentMethod method, Money amount) {
        RuntimeException last = null;
        for (int i = 0; i < attempts; i++) {
            try {
                return delegate.charge(method, amount);
            } catch (TransientGatewayException e) {
                last = e;
            }
        }
        throw last;
    }
}
```

The wrapper adds one behaviour and forwards everything else. This is the whole technique, and it is how retry, caching, metrics, logging and authorisation are added to an interface without touching any implementation.

The cost is honest: for a wide interface you write a forwarding method per operation. If you find yourself writing twenty, that is a signal the interface violates interface segregation.

### Default methods share behaviour, never state

```java
interface Comparable2<T> {
    int compareTo(T other);

    default boolean isLessThan(T other) { return compareTo(other) < 0; }
    default boolean isAtLeast(T other)  { return compareTo(other) >= 0; }
}
```

`isLessThan` is derived entirely from `compareTo`. Every implementer would write it identically, so the interface writes it once. That is the legitimate use: a convenience derived from the abstract methods.

The abuse is putting real logic in a default method and treating the interface as a base class. Because interfaces cannot hold fields, that logic has to reach for statics or re-derive state on every call, and you end up with a superclass that is worse at being a superclass.

Two rules to state in an interview: a default method should be derivable from the interface's other methods, and it should be safe for every possible implementer.

### The diamond, and how Java resolves it

```java
interface A { default String name() { return "A"; } }
interface B { default String name() { return "B"; } }

class C implements A, B {
    // Compile error unless you disambiguate:
    public String name() { return A.super.name(); }
}
```

Java refuses to guess. Class implementations always win over interface defaults, and a conflict between two interfaces must be resolved explicitly. This is why default methods are not multiple inheritance of state — there is no state to conflict over.

### Sealed types close the set

```java
public sealed interface Shape permits Circle, Square, Triangle {}
```

Now the compiler knows every implementation, a `switch` over `Shape` can be checked for exhaustiveness, and adding a variant produces compile errors at every place that needs updating. That last property is the point: it converts a runtime surprise into a compile-time task list.

Use sealed when the variant set is genuinely closed and owned by you. Use an open interface when third parties should be able to add implementations.""",
                    ),
                    (
                        "Example",
                        """Sharing audit behaviour across unrelated types, three ways.

```java
// Wrong: an abstract class forces an is-a relationship that is not true.
abstract class Auditable {
    protected List<AuditEntry> entries = new ArrayList<>();
    void audit(String event) { entries.add(new AuditEntry(event, Instant.now())); }
}
class Order extends Auditable { }        // an Order is not "an Auditable"
class Invoice extends Auditable { }      // and now neither can extend anything else
```

```java
// Better: delegate to a component each type owns.
final class AuditLog {
    private final List<AuditEntry> entries = new ArrayList<>();
    void record(String event, Clock clock) { entries.add(new AuditEntry(event, clock.instant())); }
    List<AuditEntry> entries() { return List.copyOf(entries); }
}

final class Order {
    private final AuditLog audit = new AuditLog();
}
```

```java
// Also fine for the read side: a default method derived from one abstract method.
interface Audited {
    AuditLog auditLog();
    default Optional<AuditEntry> lastEvent() {
        List<AuditEntry> all = auditLog().entries();
        return all.isEmpty() ? Optional.empty() : Optional.of(all.get(all.size() - 1));
    }
}
```

The composed `AuditLog` holds the state, the interface adds a derived convenience, and neither `Order` nor `Invoice` has burned its single inheritance slot.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Adding retry, caching, metrics or logging around an existing interface
- Sharing derived convenience methods across implementations without a base class
- Modelling a closed set of variants where exhaustiveness checking is worth having
- Evolving a published interface without breaking implementers, which is why default methods exist""",
                    ),
                    (
                        "Trade-offs",
                        """- **Delegation is verbose.** No language support in Java means forwarding methods by hand.
- **Default methods can silently change behaviour.** Adding one to a widely implemented interface gives every implementer new behaviour they did not write, which is powerful and occasionally surprising.
- **Sealed types block extension.** Great for exhaustiveness, wrong for a plugin API.
- **Static helpers are untestable seams.** A static call cannot be replaced in a test. Fine for pure functions, wrong for anything touching time, randomness or I/O.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Putting substantial logic in a default method and calling the interface a mixin
- Trying to keep state in an interface, which the language does not allow for good reasons
- Using an abstract base class purely to share a helper across unrelated types
- Sealing a hierarchy that third parties are supposed to extend
- Hiding a clock or a random source behind a static helper, making the caller untestable
- Writing forwarding methods for a twenty-method interface instead of noticing the interface is too big""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"Why can't interfaces have fields?"** Because that would reintroduce multiple inheritance of state and the diamond conflicts that come with it. Behaviour conflicts can be resolved by the implementer; state conflicts cannot be resolved sensibly at all.

**"When is a default method appropriate?"** When the method is derivable from the interface's abstract methods and every implementer would write it identically — and when you need to add a method to a published interface without breaking existing implementers.

**"What happens if two interfaces define the same default method?"** Compile error. The implementing class must override and may delegate with `A.super.name()`. A class implementation always beats an interface default.

**"When would you use a sealed interface?"** When the set of variants is closed and I want the compiler to tell me every place that needs updating when I add one — a state machine, a result type, an AST.""",
                    ),
                    (
                        "Interview Tip",
                        """When you choose composition, pre-empt the duplication question in the same breath.

> "Each notification channel composes a `RateLimiter` rather than extending a base class, so a channel can still extend something else and I can give SMS a different limiter in tests. The shared retry behaviour goes in a decorator that wraps any channel, so it is written once and applies to all of them."

You have answered "how do you avoid duplicating the shared code" before it was asked, which is what distinguishes a rehearsed answer from a designed one.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """`Order`, `Invoice` and `Shipment` all need: a created timestamp, an audit trail, and a `describe()` string built from their own fields.

Decide for each of the three needs whether it belongs in a delegated component, an interface default method, a static helper or an abstract class — and justify each choice. Then answer: which of the four would make these classes hardest to unit test, and why?""",
                    ),
                ],
                [
                    "Delegation is the default reuse mechanism; the cost is forwarding methods.",
                    "Interfaces share behaviour but never state, which is what keeps defaults safe.",
                    "A default method should be derivable from the interface's own abstract methods.",
                    "Java refuses to guess on a default-method diamond; the implementer disambiguates.",
                    "Static helpers are untestable seams — fine for pure functions, wrong for time or I/O.",
                ],
                [
                    "Why can an interface not declare instance fields?",
                    "When is a default method the right tool?",
                    "What happens when two interfaces supply the same default method?",
                    "When would you seal a hierarchy?",
                ],
            ),
        ],
    )


def _object_contracts_topic() -> dict:
    return _ood_topic(
        "object-contracts",
        "Object Contracts & Immutability",
        "equals, hashCode, compareTo and toString done correctly, and why immutable value objects remove whole categories of bug.",
        "MEDIUM",
        6,
        [
            OD(
                "object-contracts",
                "equals, hashCode and compareTo",
                "The three contracts every domain type has to honour, and what breaks when they do not.",
                13,
                "Every LLD problem ends up putting objects in a `HashMap` or a `TreeSet`. The moment it does, the correctness of your design depends on contracts most candidates have never read. This lesson covers the rules, the failures they prevent, and the specific questions interviewers ask to find out whether you know them.",
                [
                    (
                        "Why It Matters",
                        """A broken `equals`/`hashCode` pair is invisible until it is catastrophic. The object goes into a `HashSet`, `contains` returns false for the object you just added, and the bug surfaces as a duplicate booking or a lost cache entry weeks later.

Interviewers ask about this for two reasons. It is a genuine correctness issue that appears in every real codebase, and it separates candidates who have used collections from those who have only written loops.

There is also a design angle. Deciding *what makes two objects equal* forces you to say whether a type is an entity — equal by identity — or a value — equal by content. That distinction drives your whole domain model.

> Memory cue: entities are equal when their ids match. Values are equal when all their fields match. Deciding which a type is comes before writing any method.""",
                    ),
                    (
                        "Mental Model",
                        """Three contracts, each with rules the library actually relies on.

**equals** must be reflexive, symmetric, transitive, consistent, and false for null.

**hashCode** must return the same value for equal objects, and should spread unequal objects across buckets. Unequal objects *may* collide — that is allowed and handled.

**compareTo** must be antisymmetric and transitive, and should be consistent with equals: `a.compareTo(b) == 0` should imply `a.equals(b)`.

| If you break | You get |
| --- | --- |
| equals/hashCode consistency | `HashMap.get` misses an object that is in the map |
| equals symmetry | Behaviour depends on which side of the comparison you are on |
| compareTo/equals consistency | `TreeSet` silently drops elements a `HashSet` would keep |
| Mutating a field used in hashCode | The object is lost inside its own hash bucket |

That last row is the one to remember: **a key must be immutable in the fields its hash uses.** """,
                    ),
                    (
                        "How It Works",
                        """### Entities compare by identity

```java
final class Order {
    private final OrderId id;

    @Override public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Order other)) return false;
        return id.equals(other.id);
    }

    @Override public int hashCode() { return id.hashCode(); }
}
```

Two orders with the same id are the same order even if one has been edited. Comparing all fields here would be wrong: an order that changed status would stop equalling itself.

### Values compare by content, and a record does it for you

```java
record Money(long amountCents, Currency currency) {}
```

The compiler generates `equals`, `hashCode` and `toString` from the components. For value objects, this is the correct default and also the shortest code. When an interviewer asks how you would implement `equals` for a value type, the honest first answer is "make it a record", followed by the manual version if they want to see it.

### The symmetry trap with inheritance

```java
class Point {
    public boolean equals(Object o) { return o instanceof Point p && x == p.x && y == p.y; }
}
class ColourPoint extends Point {
    public boolean equals(Object o) {
        return o instanceof ColourPoint c && super.equals(c) && colour.equals(c.colour);
    }
}

Point p = new Point(1, 2);
ColourPoint c = new ColourPoint(1, 2, RED);
p.equals(c);   // true
c.equals(p);   // false  <- symmetry broken
```

There is no way to extend an instantiable class and add a value component while preserving symmetry. The standard resolutions are to compose instead of extend, or to use `getClass() != o.getClass()` rather than `instanceof` — which fixes symmetry but breaks substitutability for proxies and subclasses. Knowing that this is a genuine dilemma rather than a bug you can just fix is the senior answer.

### The mutable key disaster

```java
Set<Booking> set = new HashSet<>();
Booking b = new Booking(seat1);
set.add(b);
b.setSeat(seat2);        // hashCode changes
set.contains(b);         // false - the object is in the set, in the wrong bucket
```

The object is unreachable through the set that contains it. The fix is not to be careful; it is to make the fields used by `hashCode` final.

### toString earns its keep in logs

Give every domain type a `toString` with the fields you would want in an incident. Do not include secrets — card numbers, tokens, passwords. An interviewer who asks "what goes in toString?" is usually checking whether you have ever read a production log.""",
                    ),
                    (
                        "Example",
                        """A seat booking system where the contracts decide correctness.

```java
// Value: two seats with the same row and number are the same seat.
record Seat(int row, char number) implements Comparable<Seat> {
    @Override public int compareTo(Seat other) {
        int byRow = Integer.compare(row, other.row);
        return byRow != 0 ? byRow : Character.compare(number, other.number);
    }
}

// Entity: identity is the booking reference, not the contents.
final class Booking {
    private final BookingRef ref;        // final: safe as a map key
    private Set<Seat> seats;             // mutable, and deliberately not part of equality

    @Override public boolean equals(Object o) {
        return o instanceof Booking b && ref.equals(b.ref);
    }
    @Override public int hashCode() { return ref.hashCode(); }
    @Override public String toString() { return "Booking[" + ref + ", seats=" + seats.size() + "]"; }
}
```

Now `Set<Seat>` deduplicates correctly, `TreeSet<Seat>` gives you seats in row order, and a `Booking` stays findable in a map even after its seats change — because the only field in its hash is final.

Say that last sentence in an interview. It is the payoff of the whole lesson.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Any design that stores objects in a `HashMap`, `HashSet` or `TreeMap` — which is nearly all of them
- Deduplicating a collection, where content equality is the whole point
- Sorting: `Comparable` for the natural order, `Comparator` for everything else
- Caching, where a wrong `hashCode` shows up as a cache that never hits""",
                    ),
                    (
                        "Trade-offs",
                        """- **Identity equality hides real differences.** Two orders with the same id and different contents compare equal. That is usually what you want, and it does mean equality is not a diff.
- **`getClass()` versus `instanceof`.** `getClass()` preserves symmetry and breaks for proxies and subclasses; `instanceof` allows substitutability and cannot safely add value components. Pick and justify.
- **Records lock your layout.** Every component participates in equality. When one field should be excluded, you have to write the methods by hand.
- **Consistency with compareTo is a *should*, not a *must*.** `BigDecimal` deliberately breaks it — `2.0` and `2.00` compare equal but are not `equals`. Knowing that example is a strong signal.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Overriding `equals` and not `hashCode`
- Writing `public boolean equals(MyType other)`, which overloads rather than overrides
- Including a mutable field in `hashCode` and then mutating it while the object is a key
- Comparing floating-point fields with `==` instead of a tolerance, or using `double` for money at all
- Forgetting the null check, so `equals(null)` throws instead of returning false
- Putting sensitive data in `toString` and finding it in a log""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"What breaks if you override equals but not hashCode?"** Hash-based collections. Two equal objects can hash to different buckets, so `HashMap.get` and `HashSet.contains` miss objects that are present.

**"Can two unequal objects share a hashCode?"** Yes — that is a collision and the collection handles it by comparing with `equals` inside the bucket. The reverse is what is forbidden.

**"Why must a hash key be immutable?"** Because the bucket is chosen at insertion. Mutate a hashed field and the object sits in a bucket the lookup will never search.

**"getClass or instanceof in equals?"** `getClass` gives symmetry and rejects subclasses and proxies; `instanceof` is Liskov-friendly but cannot safely add a value component in a subclass. I default to `instanceof` with final classes, which avoids the dilemma entirely.

**"Give an example where compareTo is inconsistent with equals."** `BigDecimal`: `new BigDecimal("2.0").compareTo(new BigDecimal("2.00"))` is 0 but `equals` is false, so a `TreeSet` and a `HashSet` disagree about duplicates.""",
                    ),
                    (
                        "Interview Tip",
                        """Announce the entity-versus-value decision before you write any method. It is a design statement, not a Java trivia answer.

> "`Seat` is a value — two seats with the same row and number are interchangeable, so I will make it a record and get equality for free. `Booking` is an entity: it has a reference that persists while its contents change, so equality is the reference only, and I will keep that field final so it stays safe as a map key."

That covers equals, hashCode, immutability and map safety in one breath, and it shows the decision came from the domain rather than from habit.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Find three bugs and say what each one causes at runtime.

```java
class Ticket {
    private String id;
    private int row;
    private LocalDateTime issuedAt;

    public boolean equals(Ticket other) {
        return this.id == other.id;
    }

    public int hashCode() {
        return row;
    }
}
```

Then answer: if `Ticket` is an entity, which fields belong in `equals`, and which field must become final?""",
                    ),
                ],
                [
                    "Decide entity versus value first; that decides what equality means.",
                    "Override equals and hashCode together or hash collections silently misbehave.",
                    "Fields used by hashCode must be final, or the object gets lost in its own bucket.",
                    "You cannot add a value component in a subclass and keep equals symmetric.",
                    "Records give correct value equality for free; write it by hand only to exclude a field.",
                ],
                [
                    "What goes wrong if you override equals but not hashCode?",
                    "May two unequal objects have the same hashCode?",
                    "Why must hash key fields be immutable?",
                    "getClass or instanceof inside equals — which and why?",
                ],
            ),
            OD(
                "immutability-and-value-objects",
                "Immutability & Value Objects",
                "Why immutable types are the cheapest correctness win in an LLD design, and how to build them in Java.",
                11,
                "Immutability removes entire categories of bug at once: no defensive copying, no broken hash keys, no data races, no object observed half-constructed. It costs allocations and some ceremony. In an interview it is one of the highest-signal, lowest-effort things you can propose — and the follow-up about concurrency practically writes itself.",
                [
                    (
                        "Why It Matters",
                        """Mutable shared state is where most real bugs live. An immutable object cannot be in an inconsistent state, cannot change while another thread reads it, and cannot be altered behind the back of the object that handed it out.

That means several problems stop existing rather than being managed:

- No defensive copies on the way in or out
- No need to synchronise reads
- Safe as a `HashMap` key forever
- No half-built object visible to another thread
- Equality and hashing computed once and cached

In a design interview, proposing `Money`, `DateRange` or `Address` as immutable value objects is a small move with a large signal, and it sets you up to answer the thread-safety follow-up in one sentence.""",
                    ),
                    (
                        "Mental Model",
                        """An immutable class in Java satisfies five conditions.

1. The class is `final`, or all its constructors are private, so nobody can subclass and add mutability.
2. Every field is `private final`.
3. No method changes state; "mutators" return a new instance.
4. Mutable inputs are copied on the way in.
5. Mutable internals are copied, or wrapped unmodifiable, on the way out.

| Property | Mutable | Immutable |
| --- | --- | --- |
| Safe to share across threads | Needs synchronisation | Yes, inherently |
| Safe as a map key | Only if hashed fields never change | Always |
| Defensive copies | Required at both boundaries | Never |
| Cost of a change | Cheap in place | New allocation |
| Debuggability | State depends on history | State is where it was created |""",
                    ),
                    (
                        "How It Works",
                        """### The five conditions in code

```java
public final class DateRange {
    private final LocalDate from;
    private final LocalDate to;

    public DateRange(LocalDate from, LocalDate to) {
        if (from.isAfter(to)) throw new IllegalArgumentException("from must not be after to");
        this.from = from;       // LocalDate is already immutable, so no copy needed
        this.to = to;
    }

    public DateRange extendedTo(LocalDate newTo) {
        return new DateRange(from, newTo);      // returns a new value, changes nothing
    }

    public boolean overlaps(DateRange other) {
        return !to.isBefore(other.from) && !other.to.isBefore(from);
    }
}
```

The constructor validates once and the invariant holds forever. Nothing downstream ever has to re-check that `from` precedes `to`.

### Copying at the boundaries

The condition people forget is the second copy.

```java
public final class Itinerary {
    private final List<Leg> legs;

    public Itinerary(List<Leg> legs) {
        this.legs = List.copyOf(legs);      // copy IN: the caller cannot mutate ours afterwards
    }

    public List<Leg> legs() {
        return legs;                        // already unmodifiable, safe to return directly
    }
}
```

Without the copy in the constructor, the caller keeps a reference to the same list and can add a leg later. `List.copyOf` handles both directions at once, which is why it is the right default.

### Records give you most of this

```java
public record Money(long amountCents, Currency currency) {
    public Money {
        if (currency == null) throw new IllegalArgumentException("currency required");
    }

    public Money plus(Money other) {
        if (!currency.equals(other.currency)) throw new CurrencyMismatch(currency, other.currency);
        return new Money(amountCents + other.amountCents, currency);
    }
}
```

Records are final, have final fields, and generate equals, hashCode and toString. The compact constructor is where validation goes. What records do *not* do is deep-copy a mutable component — a `record Team(List<Player> players)` is still mutable through that list unless you copy in the compact constructor.

### Where mutability is still right

Entities with a lifecycle usually mutate: an `Order` moves from `PLACED` to `SHIPPED`. Trying to make those immutable means replacing the object everywhere it is referenced, which is a real design (event sourcing) with real costs.

The practical split: **entities mutate under controlled methods; values never mutate.** Stating that split shows you are not applying immutability as dogma.""",
                    ),
                    (
                        "Example",
                        """The same booking, mutable and immutable, and what each costs.

```java
// Mutable: every caller must be trusted, and concurrency needs a lock.
class Reservation {
    private DateRange stay;
    private Set<Seat> seats = new HashSet<>();

    Set<Seat> getSeats() { return seats; }             // caller can add seats behind our back
    void setStay(DateRange stay) { this.stay = stay; } // no revalidation against seat availability
}
```

```java
// Immutable: a change produces a new reservation, and sharing is free.
public record Reservation(BookingRef ref, DateRange stay, Set<Seat> seats) {
    public Reservation {
        seats = Set.copyOf(seats);                      // copy in, inside the compact constructor
    }

    public Reservation withStay(DateRange newStay) {
        return new Reservation(ref, newStay, seats);
    }

    public Reservation plusSeat(Seat seat) {
        Set<Seat> next = new HashSet<>(seats);
        next.add(seat);
        return new Reservation(ref, stay, next);
    }
}
```

Two things to note out loud. The compact constructor copies the set, so `Set.copyOf` protects both directions. And `plusSeat` allocates a new set each time — which is fine for a handful of seats and would be wrong for a collection of a million, where a persistent data structure or a builder would be the answer.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Value objects: `Money`, `Address`, `DateRange`, `Coordinates`, any typed identifier
- Configuration and any object shared across threads
- Map and set keys, where mutation would otherwise corrupt the collection
- Events and messages, which should never change after they are published""",
                    ),
                    (
                        "Trade-offs",
                        """- **Allocation per change.** Building a large collection one immutable step at a time is O(n) copies. Use a mutable builder internally and freeze at the end — this is exactly what `String` and `StringBuilder` do.
- **Deep immutability is harder than it looks.** A final field holding a mutable object is not immutable. `List.copyOf` and `Set.copyOf` shallow-copy, so the elements must be immutable too.
- **Entity lifecycles fight it.** Making a stateful aggregate immutable pushes you toward replacing references everywhere or toward event sourcing. Both are real choices with real cost.
- **Withers get verbose.** Five fields means five `withX` methods. A builder helps, at the price of more code.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Declaring fields `final` and returning the live mutable collection from a getter
- Forgetting to copy a mutable argument in the constructor
- Assuming a record is deeply immutable when it holds a `List` or an array
- Making every entity immutable and ending up rebuilding an object graph on each edit
- Using `double` for money — a rounding problem no amount of immutability fixes
- Claiming thread safety from immutability while a field is still non-final""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"Why is an immutable object thread-safe?"** Its state never changes after construction, so there is nothing to race on. Final fields also carry a safe-publication guarantee in the Java memory model, so another thread cannot observe a partially constructed object.

**"Is `final` enough to make a class immutable?"** No. `final` on a field prevents reassignment, not mutation of what it points to. A `final List` can still be added to.

**"How do you make a large immutable collection efficiently?"** Build it with a mutable builder and produce the immutable value once at the end, or use a persistent structure that shares unchanged parts between versions.

**"When would you not make something immutable?"** For entities with a real lifecycle, and on hot paths where per-change allocation matters. I would still keep value objects immutable and mutate only inside the entity's own methods.""",
                    ),
                    (
                        "Interview Tip",
                        """Introduce immutability as a concurrency answer before anyone asks about concurrency. It pre-empts a whole line of questioning.

> "`Money` and `DateRange` are immutable records. That means I can share them across threads with no locking, they are safe as map keys, and the only place validation has to live is the constructor. The mutable part of the design is the `Reservation` aggregate, and I will put a lock around the one method that changes it."

You have just answered "how would you make this thread-safe?" in advance, and you have shown you know which parts actually need the lock.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """This class claims to be immutable. Find the three ways it is not.

```java
public class Trip {
    private final String name;
    private final List<String> stops;
    private final Date departure;

    public Trip(String name, List<String> stops, Date departure) {
        this.name = name;
        this.stops = stops;
        this.departure = departure;
    }

    public List<String> getStops() { return stops; }
    public Date getDeparture() { return departure; }
}
```

Then rewrite it as a record and say which single JDK type choice removes one of the three problems on its own.""",
                    ),
                ],
                [
                    "Immutable means final class, final fields, no mutators, and copies at both boundaries.",
                    "A final field holding a mutable object is not immutability.",
                    "Records are shallowly immutable; copy mutable components in the compact constructor.",
                    "Immutable objects are inherently thread-safe and permanently valid map keys.",
                    "Values never mutate; entities mutate only through their own controlled methods.",
                ],
                [
                    "Why is an immutable object thread-safe without synchronisation?",
                    "Does making every field final make a class immutable?",
                    "How do you build a large immutable collection efficiently?",
                    "When is immutability the wrong choice?",
                ],
            ),
        ],
    )


# ---------------------------------------------------------------------------
# Module 2 — Designing the seams
# ---------------------------------------------------------------------------


def _interfaces_topic() -> dict:
    return _ood_topic(
        "interfaces",
        "Interfaces & Abstract Classes",
        "Choosing between the two, sizing an interface from the caller's needs, and evolving a contract without breaking implementers.",
        "EASY",
        7,
        [
            OD(
                "interfaces",
                "Interfaces",
                "The contract-first tool that makes designs testable, swappable and honest about their boundaries.",
                12,
                "An interface is a promise with no implementation attached. In a low-level design interview it is the main instrument you have for drawing a boundary, and the first question an interviewer will ask about any interface you draw is why it has the methods it has.",
                [
                    (
                        "Why It Matters",
                        """An interface is where you decide what a caller is allowed to know. Get that wrong in either direction and the design suffers.

Too wide and every implementer carries methods it does not need, every fake in a test stubs twelve methods, and every change ripples to classes that never cared. Too narrow and callers combine three interfaces to do one job, which is its own kind of noise.

Interfaces are also what make a design testable at all. A class that names a concrete database cannot be tested without one; the same class taking a `Repository` can be tested with a `HashMap`. Interviewers use testability as the proxy for design quality precisely because it is objectively checkable.

> Memory cue: an interface belongs to the caller, not the implementer. Name it for what the caller wants done.""",
                    ),
                    (
                        "Mental Model",
                        """Interface or abstract class — a decision table.

| | Interface | Abstract class |
| --- | --- | --- |
| State | None | Instance fields allowed |
| Multiple supertypes | Yes | No, single inheritance |
| Shares | Contract plus derived defaults | Contract plus implementation plus state |
| Constructor | No | Yes, can enforce invariants |
| Use for | A capability many unrelated types can have | A partially built algorithm you own end to end |

The default is the interface. Reach for an abstract class only when you need shared state or a template method whose call order you must control.

Sizing rule: **one interface per reason a caller depends on you.** If two callers want different things from the same class, that is two role interfaces and one implementation.""",
                    ),
                    (
                        "How It Works",
                        """### Name interfaces for the need, not the implementation

```java
// Implementer-shaped. Tells a caller nothing about why it exists.
interface UserDao { User findById(long id); void insert(User u); void update(User u);
                    void delete(long id); List<User> findAll(); /* ... 9 more ... */ }

// Caller-shaped. Each one names a job.
interface FindsUser     { Optional<User> byId(UserId id); }
interface RegistersUser { UserId register(NewUser user); }
```

One `JdbcUserStore` can implement both. The login service depends on `FindsUser` and cannot accidentally delete anything. The test fake for login is three lines.

Avoid the `IUserService` and `UserServiceImpl` naming convention — it signals that the interface was created for the implementation rather than for a caller, which is exactly backwards.

### Program to the widest useful type

```java
// Over-specified: callers now cannot pass a Set or an immutable list.
void process(ArrayList<Order> orders);

// Right: accept the most general type that supports what you do.
void process(Collection<Order> orders);
```

The mirror rule on returns: be specific enough to be useful, general enough to change. Returning `List<Order>` rather than `ArrayList<Order>` keeps the implementation free.

### Evolving an interface without breaking the world

Adding a method to a published interface breaks every implementer. Java gives you three options:

- **Default method.** Add the method with a sensible implementation derived from the existing ones. This is why `default` was added to the language — `Collection.stream()` shipped this way.
- **A second interface.** Leave the original alone and let implementations opt in, which is the capability-interface approach.
- **Version the contract.** For a genuinely breaking change, a new interface and a deprecation window.

Being able to name these three is a strong senior signal, because it shows you have maintained a contract other people depend on.

### Functional interfaces are interfaces

A single-method interface can be implemented by a lambda, which makes test fakes nearly free:

```java
interface Clock { Instant now(); }

Clock fixed = () -> Instant.parse("2024-01-01T00:00:00Z");
```

Designing interfaces small enough to be lambdas is a habit worth having; it is interface segregation with an immediately visible payoff.""",
                    ),
                    (
                        "Example",
                        """A rate limiter boundary, sized two ways.

```java
// Too wide: the caller only ever asks one question, but depends on six methods.
interface RateLimiter {
    boolean allow(String key);
    void reset(String key);
    void setLimit(String key, int limit);
    int remaining(String key);
    Map<String, Integer> snapshot();
    void shutdown();
}
```

```java
// Right-sized: two roles, one implementation, and each caller sees only its own.
interface RateLimiter   { boolean allow(RateKey key); }          // the request path
interface RateLimitAdmin {                                        // the admin console
    void setLimit(RateKey key, Limit limit);
    void reset(RateKey key);
}

final class TokenBucketLimiter implements RateLimiter, RateLimitAdmin { /* ... */ }
```

The payoff is visible in the test: the request-path test uses `key -> true` as its limiter, which is a lambda rather than a mock. And no handler on the request path can call `shutdown()` by accident, because it never had that method.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Every boundary to something external: payments, storage, email, clock, randomness
- Strategy and plugin points where implementations are chosen at runtime
- Test seams — the single most common reason to introduce an interface in practice
- Multiple inheritance of capability, which Java allows for types and not for state""",
                    ),
                    (
                        "Trade-offs",
                        """- **An interface for a single implementation is usually noise.** The exceptions are boundaries you want to fake in tests and dependencies you expect to change.
- **Many small interfaces means many names.** Precision costs navigability; a reader assembles the picture from several files.
- **Default methods make evolution easy and behaviour implicit.** Implementers silently inherit code they did not write.
- **Abstract classes are more concise when they fit.** Shared state plus a fixed call order is genuinely less code as a base class than as a field plus delegation.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Creating an interface for every class as a matter of policy
- Naming interfaces after implementations rather than after caller needs
- Fat repository interfaces that force every test to stub methods it never calls
- Declaring parameters as `ArrayList` or `HashMap` instead of `List` or `Map`
- Leaking an implementation type — `SQLException`, a vendor enum — through the interface
- Putting real logic into default methods and using the interface as a base class""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"Interface or abstract class here?"** Interface unless I need shared state or a controlled call order. Interfaces allow multiple supertypes and keep implementers free to extend something else.

**"How do you decide which methods go on an interface?"** From the caller. I write the call site first and extract the interface it needed. If two callers want different things, that is two interfaces.

**"How do you add a method to an interface a hundred classes implement?"** A default method if a sensible default exists, a second capability interface if it does not, or a versioned contract with a deprecation window for a genuinely breaking change.

**"Is an interface with one implementation a smell?"** Often, yes. It is justified at a boundary I want to fake, or a dependency I expect to swap. Not justified as a reflex.""",
                    ),
                    (
                        "Interview Tip",
                        """Derive the interface from a call site out loud. It demonstrates the habit rather than describing it.

> "Let me write how checkout wants to use this: `payments.charge(method, total)` returning a receipt or throwing a declined exception. That is the whole interface — one method. Everything else the gateway can do belongs to the admin path, and that is a different interface with a different caller."

You have justified the shape with evidence, and you have pre-answered the interface-segregation question.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Three callers use one `FileStorage` class: an upload handler (write), a download handler (read), and a nightly cleanup job (list and delete).

Design the interfaces. Then answer two follow-ups: which interface does the upload handler's unit test need to fake, and what stops the download handler from deleting a file?""",
                    ),
                ],
                [
                    "An interface belongs to its caller and is named for the job, not the implementation.",
                    "Default to interfaces; use an abstract class for shared state or a controlled call order.",
                    "Derive the method list from a call site you write first.",
                    "Default methods, capability interfaces and versioning are the three evolution options.",
                    "An interface small enough to be a lambda gives you free test doubles.",
                ],
                [
                    "When would you choose an abstract class over an interface?",
                    "How do you decide what methods belong on an interface?",
                    "How do you add a method to an interface with many implementers?",
                    "Is an interface with a single implementation always wrong?",
                ],
            ),
            OD(
                "error-handling-design",
                "Designing Error Handling",
                "Exceptions as part of the contract, checked vs unchecked, and the alternatives to throwing.",
                12,
                "Error handling is part of your API design, not an afterthought bolted on at the end. Interviewers probe it because it reveals whether you have operated software: what a caller can do about a failure, whether a retry is safe, and what ends up in the log are all design decisions you make when you choose how to signal failure.",
                [
                    (
                        "Why It Matters",
                        """The failure path is half of every interface and the half candidates skip. When you write `void charge(Money amount)` you have said nothing about what happens when the card is declined, the network times out, or the amount is negative — and those three need completely different handling.

- A declined card is expected. The caller shows a message. It is not an error in the exceptional sense.
- A timeout may be retryable, and whether retrying is safe depends on idempotency.
- A negative amount is a programming bug and should fail loudly and immediately.

An interviewer who asks "what happens when the payment fails?" is checking whether you distinguish those. The answer is a design, not a `try/catch`.

> Memory cue: throw for what the caller cannot anticipate; return a value for what is a normal outcome.""",
                    ),
                    (
                        "Mental Model",
                        """Classify every failure before choosing a mechanism.

| Failure kind | Example | Signal with |
| --- | --- | --- |
| **Expected outcome** | Card declined, item out of stock, user not found | A return value: `Optional`, a result type, an enum |
| **Caller error** | Null argument, negative amount, illegal state | Unchecked exception, fail fast |
| **Recoverable environment failure** | Timeout, service unavailable | Exception the caller can catch and retry, plus a retryable flag |
| **Unrecoverable** | Config missing at startup, disk full | Fail fast and loudly; do not paper over it |

The rule underneath: **if the caller has a sensible action for it, it belongs in the return type. If they do not, throw.** """,
                    ),
                    (
                        "How It Works",
                        """### Expected outcomes are values, not exceptions

```java
// Exceptions for control flow: every caller writes a try/catch for a normal case.
Money charge(Card card, Money amount) throws CardDeclinedException;

// The declined case is an outcome, so it lives in the type.
sealed interface ChargeResult {
    record Approved(TransactionId id) implements ChargeResult {}
    record Declined(DeclineReason reason) implements ChargeResult {}
}

ChargeResult charge(Card card, Money amount);
```

With a sealed result the compiler forces the caller to handle both branches. With an exception, a caller that forgets the catch compiles fine and fails in production. That difference is the argument to make.

`Optional` is the small version of the same idea: `Optional<User> findById(UserId id)` says absence is normal, whereas `User findById(UserId id)` that returns null says nothing and fails later.

### Checked versus unchecked, honestly

The Java community has largely settled on unchecked exceptions for most cases, and you should be able to say why without being dogmatic.

- Checked exceptions force handling, which is valuable for genuinely recoverable conditions a caller must address.
- In practice they propagate through every layer, pollute signatures, and get swallowed with an empty catch block — which is strictly worse than not catching.
- Unchecked exceptions keep signatures clean and trust the caller to handle at the right layer, usually a boundary.

A defensible position: unchecked by default, checked only where a caller genuinely has a recovery action and you want the compiler to insist. Modern libraries mostly do this.

### Domain exceptions carry data

```java
// Useless in an incident: no idea which account or how much.
throw new RuntimeException("insufficient funds");

// Useful: the log line and the retry decision both have what they need.
public final class InsufficientFunds extends RuntimeException {
    private final AccountId account;
    private final Money requested;
    private final Money available;

    public InsufficientFunds(AccountId account, Money requested, Money available) {
        super("account %s: requested %s, available %s".formatted(account, requested, available));
        this.account = account;
        this.requested = requested;
        this.available = available;
    }
}
```

An exception type is a class like any other. Give it the fields a handler needs to decide what to do.

### Never swallow, never leak

```java
try { gateway.charge(card, amount); }
catch (Exception e) { }                                   // the worst line in any codebase

try { gateway.charge(card, amount); }
catch (StripeApiException e) {
    throw new PaymentFailed(orderId, e);                  // translate, preserve the cause
}
```

Two rules. Never catch and discard — you have deleted the only evidence. And translate at the boundary: a `SQLException` escaping into business logic means every caller now depends on JDBC, which is a dependency inversion failure showing up as an exception type.

### Cleanup and partial failure

`try-with-resources` closes resources deterministically and suppresses secondary exceptions correctly. Beyond that, the question interviewers actually care about is what happens when an operation half-succeeds: the charge went through and the order write failed. The answers are idempotency keys, compensating actions, or an outbox — and knowing that this is the question is most of the credit.""",
                    ),
                    (
                        "Example",
                        """A booking flow with each failure classified.

```java
public final class BookSeats {
    public BookingResult book(ShowId show, List<Seat> seats, PaymentMethod method) {
        if (seats.isEmpty()) {
            throw new IllegalArgumentException("at least one seat required");   // caller bug
        }

        Optional<Reservation> held = inventory.hold(show, seats);
        if (held.isEmpty()) {
            return BookingResult.seatsUnavailable(seats);                       // expected outcome
        }

        try {
            ChargeResult charge = payments.charge(method, priceOf(seats));
            if (charge instanceof ChargeResult.Declined d) {
                inventory.release(held.get());
                return BookingResult.declined(d.reason());                      // expected outcome
            }
            return BookingResult.confirmed(bookings.confirm(held.get()));
        } catch (GatewayTimeout e) {
            // Environment failure. The charge may or may not have happened, so we cannot
            // simply release the hold - reconciliation decides, keyed by the idempotency key.
            bookings.markPendingReconciliation(held.get(), e.idempotencyKey());
            throw new BookingInProgress(held.get().ref(), e);
        }
    }
}
```

Three different mechanisms for three different kinds of failure, and the timeout branch says out loud that the outcome is unknown — which is the honest answer and the one interviewers are listening for.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Designing any method that talks to an external system
- Answering "what happens when this fails?" in an LLD or system design interview
- API design questions: status codes, error bodies, and what a client can act on
- Retry and idempotency discussions, which always begin with classifying the failure""",
                    ),
                    (
                        "Trade-offs",
                        """- **Result types force handling and add ceremony.** Every caller unwraps. Worth it on a boundary where forgetting is expensive; overkill for an internal helper.
- **Unchecked exceptions keep signatures clean and can be missed.** You trade compiler help for readability, so the boundary handler must be genuinely comprehensive.
- **Exception translation adds layers of types.** Each boundary gets its own exception family. That is the price of not leaking vendor types inward.
- **Fail fast versus degrade.** Failing fast surfaces bugs; degrading keeps users served. Which is right depends on whether the feature is core or ancillary, and saying that distinction is the point.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Using exceptions for normal outcomes like "not found" or "declined"
- Catching `Exception` and logging without rethrowing, hiding a bug forever
- Returning null instead of `Optional` and pushing the failure to a later line
- Letting `SQLException` or a vendor type escape into business logic
- Throwing a bare `RuntimeException` with a string and no context fields
- Retrying a non-idempotent operation after a timeout, causing a double charge""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"Checked or unchecked?"** Unchecked by default so signatures stay clean; checked only when the caller has a real recovery action and I want the compiler to insist. Checked exceptions that everyone wraps or swallows are worse than none.

**"When would you return a result type instead of throwing?"** When the failure is an expected business outcome. Declined payments and out-of-stock items are not exceptional; making the caller handle them explicitly is better than hoping they wrote a catch.

**"What do you do on a payment timeout?"** Treat the outcome as unknown. Never blindly retry a non-idempotent charge — use an idempotency key so a retry is safe, and reconcile if the state is still ambiguous.

**"Is it ever right to catch and ignore?"** Almost never. The narrow exception is a genuinely optional side effect, and even then I log at debug with the cause so the evidence exists.""",
                    ),
                    (
                        "Interview Tip",
                        """Classify out loud before you choose a mechanism. It turns a vague question into a structured answer.

> "Three failure kinds here. Out of stock is a business outcome, so it goes in the return type and the caller must handle it. A bad quantity is a caller bug — unchecked exception, fail fast. A warehouse timeout is an environment failure where the outcome is unknown, so I need an idempotency key before I let anything retry."

Most candidates answer this question with `try/catch`. Classification is what makes it a design answer.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Design the failure contract for `transfer(fromAccount, toAccount, amount)`.

Enumerate at least five distinct failure modes, classify each one, and choose the signalling mechanism. Then answer the hard question: the debit succeeded and the credit timed out. What does your design do, and what does the caller see?""",
                    ),
                ],
                [
                    "Classify each failure before choosing a mechanism: outcome, caller bug, environment, fatal.",
                    "Expected business outcomes belong in the return type, not in an exception.",
                    "Unchecked by default; checked only where the caller has a real recovery action.",
                    "Translate vendor exceptions at the boundary so they never reach business logic.",
                    "After a timeout the outcome is unknown — idempotency keys are what make retry safe.",
                ],
                [
                    "Checked or unchecked exceptions, and why?",
                    "When do you return a result type instead of throwing?",
                    "What do you do when a payment call times out?",
                    "Is catching and ignoring an exception ever defensible?",
                ],
            ),
        ],
    )


def _dependency_injection_topic() -> dict:
    return _ood_topic(
        "dependency-injection",
        "Dependency Injection",
        "Giving an object its collaborators, why it is the single biggest testability lever, and where the wiring goes.",
        "MEDIUM",
        8,
        [
            OD(
                "dependency-injection",
                "Dependency Injection",
                "Constructor injection, the composition root, and the seams that make a class testable.",
                12,
                "Dependency injection is a two-sentence idea with an outsized effect: instead of a class creating what it needs, it is handed what it needs. Interviewers care because the presence or absence of injection decides whether your design can be tested at all, and because candidates who have only used a framework often cannot explain what the framework is doing.",
                [
                    (
                        "Why It Matters",
                        """Every `new` inside a class is a decision the caller cannot change. That includes the test.

```java
class OrderService {
    private final StripeGateway gateway = new StripeGateway(System.getenv("STRIPE_KEY"));
    private final Clock clock = Clock.systemUTC();
}
```

Testing this needs an API key, a network, and patience while real time passes. There is no seam — no place where a test can substitute something. Injection creates the seam:

```java
class OrderService {
    private final PaymentGateway gateway;
    private final Clock clock;

    OrderService(PaymentGateway gateway, Clock clock) {
        this.gateway = gateway;
        this.clock = clock;
    }
}
```

Now the test supplies a fake gateway and a fixed clock, and runs in a millisecond. That is the whole value proposition, and it is why "how would you test this?" is such a reliable interview question — it finds the missing seams immediately.

> Memory cue: dependency injection is not a framework. It is passing arguments instead of calling `new`.""",
                    ),
                    (
                        "Mental Model",
                        """Three injection styles, one clear default.

| Style | Shape | Use when |
| --- | --- | --- |
| **Constructor** | Required collaborators as parameters | Almost always — the object cannot exist half-built |
| **Setter** | `setX(...)` after construction | Genuinely optional collaborators; introduces temporal coupling |
| **Method** | Passed to one call | Used by a single method, not held as state |

Constructor injection is the default because it makes dependencies visible and non-optional. A constructor with six parameters is not a reason to switch to setters — it is the class telling you it has too many responsibilities. Listen to it.

Above the classes sits the **composition root**: the one place that knows every concrete type and assembles the graph. Usually `main`, a factory, or a framework configuration class.""",
                    ),
                    (
                        "How It Works",
                        """### Inversion of control, in one picture

Without injection the dependency arrow points from your policy to a concrete detail. With injection it points from both to an interface, and a third place wires them.

`OrderService → PaymentGateway ← StripeGateway`, with `main` knowing all three.

That is the same inversion as the dependency inversion principle, which is why the two ideas are so often conflated. DIP is the principle about which direction the arrow points; DI is the technique of passing the collaborator in.

### The composition root

```java
public static void main(String[] args) {
    DataSource ds = new HikariDataSource(config);
    Clock clock = Clock.systemUTC();

    Orders orders = new JdbcOrders(ds);
    PaymentGateway payments = new RetryingGateway(new StripeGateway(key), 3);
    Notifier notifier = new EmailNotifier(smtp);

    OrderService service = new OrderService(orders, payments, notifier, clock);
    new HttpServer(service).start();
}
```

One file knows everything concrete. Every other file knows only interfaces. Notice that `RetryingGateway` wraps `StripeGateway` here — decoration is a wiring decision, invisible to `OrderService`, which is exactly the flexibility injection buys.

### Service locator is not the same thing, and is worse

```java
class OrderService {
    void place(Order o) {
        PaymentGateway gateway = ServiceLocator.get(PaymentGateway.class);   // hidden dependency
    }
}
```

The dependency is real but invisible in the signature. You cannot tell what this class needs without reading every method, tests must populate a global registry, and a missing registration fails at runtime instead of compile time. When an interviewer offers service locator as an alternative, these three points are the answer.

### Frameworks do this and nothing more

Spring, Guice and Dagger read your constructors and build the graph for you. They add lifecycle management, scoping and configuration. They do not add any capability that manual wiring lacks — a fact worth stating, because it shows you understand the pattern rather than the tool.

For an interview, wire by hand. It is shorter, it is explicit, and it demonstrates the idea directly.

### Injecting the awkward dependencies

The high-value injections are the ones candidates forget:

- **Clock.** Never call `Instant.now()` inside domain logic. Inject a `Clock` and tests can pin time.
- **Randomness.** Inject a `Random` or an id generator so a test can be deterministic.
- **UUID and id generation.** Same reason.
- **Configuration.** Pass values in rather than reading environment variables deep in a class.

Proposing an injected clock unprompted is one of the strongest small signals available in an LLD interview, because it is the thing people learn only after being burned by a flaky test.""",
                    ),
                    (
                        "Example",
                        """A rate limiter, and what injecting the clock buys.

```java
public final class TokenBucketLimiter implements RateLimiter {
    private final Clock clock;
    private final int capacity;
    private final double refillPerSecond;
    private final Map<RateKey, Bucket> buckets = new ConcurrentHashMap<>();

    public TokenBucketLimiter(Clock clock, int capacity, double refillPerSecond) {
        this.clock = clock;
        this.capacity = capacity;
        this.refillPerSecond = refillPerSecond;
    }

    public boolean allow(RateKey key) {
        Bucket bucket = buckets.computeIfAbsent(key, k -> new Bucket(capacity, clock.instant()));
        synchronized (bucket) {
            bucket.refill(clock.instant(), refillPerSecond, capacity);
            return bucket.tryConsume();
        }
    }
}
```

The test is now deterministic and instant:

```java
var clock = new MutableClock(Instant.parse("2024-01-01T00:00:00Z"));
var limiter = new TokenBucketLimiter(clock, 2, 1.0);

assertTrue(limiter.allow(key));
assertTrue(limiter.allow(key));
assertFalse(limiter.allow(key));      // bucket empty

clock.advance(Duration.ofSeconds(1));
assertTrue(limiter.allow(key));       // refilled - no Thread.sleep anywhere
```

Without the injected clock this test contains `Thread.sleep(1000)`, takes a second, and is flaky on a loaded CI machine. That contrast is worth stating explicitly in an interview.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Every LLD design that talks to storage, payments, messaging or time
- Answering "how would you unit test this?" — injection is usually the whole answer
- Introducing a decorator such as retry or caching without touching the consumer
- Swapping an implementation per environment: in-memory in tests, real in production""",
                    ),
                    (
                        "Trade-offs",
                        """- **Wiring becomes explicit and verbose.** Object graphs are built by hand or by a framework you must then understand.
- **Constructor parameter lists grow.** That is usually a genuine signal about responsibilities, but it does mean refactoring rather than a quick fix.
- **A container adds indirection and startup magic.** Annotation-driven wiring is concise and harder to trace than a constructor call.
- **Over-injection hurts.** Injecting a pure function or a stable standard-library type buys nothing and adds a parameter. Inject what is slow, external, non-deterministic or likely to change.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Calling `new` on an external collaborator inside a constructor and calling it injection
- Reading configuration or environment variables deep inside a domain class
- Using a static service locator or singleton registry and thinking it is equivalent
- Calling `Instant.now()`, `Math.random()` or `UUID.randomUUID()` inside logic you want to test
- Setter injection for required collaborators, so the object exists in an unusable state
- Believing dependency injection requires a framework""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"What problem does dependency injection solve?"** It creates seams. A class that is handed its collaborators can be given fakes, decorated, or reconfigured per environment. A class that constructs them cannot.

**"Constructor or setter injection?"** Constructor for anything required — the object is never in a half-built state and the dependency list is visible in one place. Setter only for genuinely optional collaborators.

**"Why is a service locator worse?"** It hides dependencies from the signature, needs global state in tests, and turns a compile-time wiring error into a runtime one.

**"Do you need Spring for this?"** No. DI is passing arguments. A framework automates the wiring and adds scoping and lifecycle; it does not add the capability.

**"What would you inject that people forget?"** The clock, random sources and id generators. They are the usual cause of flaky tests and they are trivial to inject.""",
                    ),
                    (
                        "Interview Tip",
                        """Justify injection with the test you want to write, and name the clock specifically.

> "The limiter takes a `Clock` in its constructor rather than calling `Instant.now()`. That way the refill test advances a fake clock instead of sleeping — deterministic, and it runs in a millisecond. Same reasoning for the id generator, so the assertions can name the id they expect."

Naming the clock is a small detail that reliably reads as production experience.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Make this class testable without a network, a database or real time. List the seams you introduce and write the constructor signature.

```java
class SubscriptionRenewal {
    void renewAll() {
        var due = Database.query("SELECT * FROM subs WHERE renews_at < NOW()");
        for (var sub : due) {
            new StripeClient(System.getenv("KEY")).charge(sub.token(), sub.price());
            Database.execute("UPDATE subs SET renews_at = ? WHERE id = ?",
                             LocalDate.now().plusMonths(1), sub.id());
            new Mailer().send(sub.email(), "Renewed");
        }
    }
}
```

Then answer: which single injected dependency makes the largest difference to the test, and why?""",
                    ),
                ],
                [
                    "Dependency injection is passing collaborators in, not a framework.",
                    "Constructor injection for anything required; the object is never half-built.",
                    "One composition root knows every concrete type so no other file has to.",
                    "A service locator hides dependencies and moves wiring errors to runtime.",
                    "Inject the clock, randomness and id generation — that is where flaky tests come from.",
                ],
                [
                    "What problem does dependency injection actually solve?",
                    "Constructor versus setter injection — which and when?",
                    "Why is a service locator worse than injection?",
                    "Do you need a framework to do dependency injection?",
                ],
            ),
            OD(
                "testable-design",
                "Designing for Testability",
                "Seams, test doubles, and why an untestable design is usually a badly coupled one.",
                11,
                "Testability is not a separate concern from design; it is a measurement of it. A class that is hard to test is hard to reuse, hard to reason about and tightly coupled to something it should not know. Interviewers use \"how would you test this?\" as a fast, objective proxy for design quality, so it is worth being able to answer it precisely.",
                [
                    (
                        "Why It Matters",
                        """When an interviewer asks how you would test your design, they are not changing topic. They are checking the same thing from a direction you cannot bluff.

An untestable class always has an identifiable cause: a hidden dependency, a static call, real time, real randomness, or a constructor that does work. Each one is a coupling problem, and fixing it for the test improves the design for everyone.

There is also a communication payoff. Saying "this test needs a fake repository and a fixed clock, nothing else" describes your dependency graph precisely in one sentence.""",
                    ),
                    (
                        "Mental Model",
                        """A **seam** is a place where you can change behaviour without editing the class. Every test double goes through a seam.

| Double | What it does | Use when |
| --- | --- | --- |
| **Dummy** | Passed but never used | Filling a required parameter |
| **Stub** | Returns canned answers | The test needs the collaborator to supply input |
| **Fake** | A real, simplified implementation | In-memory repository, mutable clock |
| **Spy** | Records the calls it received | You need to assert an interaction happened |
| **Mock** | Pre-programmed with expectations, verifies them | Interaction is the behaviour under test |

The useful default is **fakes over mocks**. A mock-heavy test asserts how the code is written rather than what it does, so it breaks on every refactor. An in-memory fake asserts outcomes and survives.""",
                    ),
                    (
                        "How It Works",
                        """### The five things that destroy testability

- **Static calls to I/O.** `Database.query(...)` has no seam at all.
- **`new` on an external collaborator.** The test cannot substitute it.
- **Real time.** `Instant.now()` makes assertions non-deterministic and tests slow.
- **Randomness.** `Math.random()`, `UUID.randomUUID()` — same problem.
- **Constructors that do work.** Opening a connection in a constructor means you cannot even build the object in a test.

Each has the same fix: pass the thing in.

### A fake is usually ten lines

```java
final class InMemoryOrders implements Orders {
    private final Map<OrderId, Order> byId = new HashMap<>();

    public void save(Order order) { byId.put(order.id(), order); }
    public Optional<Order> byId(OrderId id) { return Optional.ofNullable(byId.get(id)); }
}
```

Written once, reused by every test in the module, and it exercises real behaviour: save then load actually round-trips. A mocking framework would need setup in every test and would verify calls rather than outcomes.

### Test behaviour, not structure

```java
// Structural: passes only while the implementation calls these exact methods in this order.
verify(repository).findById(id);
verify(gateway).charge(any(), any());
verify(repository).save(any());

// Behavioural: passes for any implementation that gets the job done.
var result = service.place(order);
assertEquals(CONFIRMED, result.status());
assertEquals(1, fakeGateway.charges().size());
assertTrue(fakeOrders.byId(order.id()).isPresent());
```

The second test survives a refactor that reorders the calls or merges two of them. The first does not. When an interviewer asks about mocks, this is the trade-off they want named.

### Humble object: separate logic from the untestable edge

When something genuinely cannot be tested — a UI, a raw socket, a scheduler — push all the logic out of it into a plain object and leave a shell with no branching.

```java
// Untestable shell: no logic, nothing to get wrong.
class PaymentController {
    private final PlaceOrder placeOrder;
    void post(HttpRequest req, HttpResponse res) {
        res.write(placeOrder.handle(parse(req)));
    }
}
```

All the decisions live in `PlaceOrder`, which is a plain class with injected collaborators and needs no HTTP at all.

### The pyramid, and what it means in an interview

Many fast unit tests, fewer integration tests that check wiring and SQL, a handful of end-to-end tests for critical journeys. If your design pushes work down the pyramid — domain logic in plain objects, adapters kept thin — you get fast feedback. If all your logic sits in controllers and repositories, everything has to be tested end to end and the suite takes twenty minutes.""",
                    ),
                    (
                        "Example",
                        """The same fee rule, untestable and testable.

```java
// Untestable: static I/O, real time, real randomness, work in the constructor.
class LateFeeJob {
    private final Connection conn = DriverManager.getConnection(URL);

    void run() {
        for (Loan loan : LoanDb.overdue(LocalDate.now())) {
            Money fee = Money.cents(loan.daysOverdue() * 25);
            LoanDb.addFee(loan.id(), fee);
            Mailer.send(loan.memberEmail(), "Late fee: " + fee);
        }
    }
}
```

```java
// Testable: every edge is a seam, and the rule is a pure function.
public final class LateFeePolicy {
    public Money feeFor(Loan loan, LocalDate today) {
        long daysLate = ChronoUnit.DAYS.between(loan.dueDate(), today);
        return daysLate <= 0 ? Money.ZERO : Money.cents(daysLate * 25);
    }
}

public final class LateFeeJob {
    private final Loans loans;
    private final Notifier notifier;
    private final Clock clock;
    private final LateFeePolicy policy;
    // constructor omitted

    public void run() {
        LocalDate today = LocalDate.now(clock);
        for (Loan loan : loans.overdueAsOf(today)) {
            Money fee = policy.feeFor(loan, today);
            loans.addFee(loan.id(), fee);
            notifier.notifyUser(loan.memberId(), Message.lateFee(fee));
        }
    }
}
```

The fee rule — the part with the actual business risk — is now a pure function you can test with a table of inputs and no infrastructure at all. That separation is the point, and it is worth naming: **push the decisions into pure code and keep the I/O at the edges.** """,
                    ),
                    (
                        "Common Use Cases",
                        """- Answering "how would you test this?" after presenting an LLD design
- Refactoring a legacy class the interviewer hands you and asks you to bring under test
- Justifying an interface at a boundary in terms of the test it enables
- Explaining why business rules belong in plain objects rather than in controllers""",
                    ),
                    (
                        "Trade-offs",
                        """- **Fakes are code you maintain.** An in-memory repository can drift from the real one. Contract tests run the same suite against both and keep them honest.
- **Mocks are quick and couple to structure.** They are right when the interaction *is* the requirement — "an audit event must be published" — and wrong as a default.
- **Seams add indirection.** Every injected interface is one more hop for a reader.
- **Total testability is not the goal.** Some code is a thin adapter with no logic; testing it end to end once is cheaper than faking the world.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Calling static I/O helpers from domain logic, leaving no seam
- Doing real work — connections, file reads — inside a constructor
- Asserting on method calls rather than outcomes, producing tests that break on refactor
- Writing one fake per test instead of one reusable fake per interface
- Using `Thread.sleep` in a test instead of injecting a controllable clock
- Treating testability as a separate task rather than as feedback about coupling""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"How would you test this class?"** Name the seams: which collaborators are injected, which fakes you supply, and what you assert. If you cannot name them, the design needs changing first.

**"Mocks or fakes?"** Fakes by default, because they assert outcomes and survive refactoring. Mocks when the interaction itself is the requirement, such as verifying an audit event was published.

**"How do you test time-dependent behaviour?"** Inject a `Clock` and advance it. Never sleep in a test — it is slow and flaky under CI load.

**"What makes a class hard to test?"** Hidden dependencies: statics, `new` on externals, real time, randomness, and constructors that do work. Each is a coupling problem the test is surfacing.""",
                    ),
                    (
                        "Interview Tip",
                        """Volunteer the test plan before you are asked. It closes an entire line of questioning and demonstrates that the seams were deliberate.

> "For testing, `LateFeePolicy` is a pure function so it gets a table of day counts and expected fees. `LateFeeJob` gets an in-memory `Loans`, a recording notifier and a fixed clock, and I assert the fee was written and one notification was recorded. Nothing in that suite touches a database or sleeps."

That paragraph tells the interviewer your dependency graph, your seams and your assertion style in about fifteen seconds.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """List every reason this class cannot be unit tested, then rewrite its constructor and method signature so it can be.

```java
class SessionManager {
    private static final Map<String, Session> SESSIONS = new HashMap<>();

    String createSession(String userId) {
        String token = UUID.randomUUID().toString();
        SESSIONS.put(token, new Session(userId, System.currentTimeMillis() + 3600_000));
        AuditLog.write("session created for " + userId);
        return token;
    }

    boolean isValid(String token) {
        Session s = SESSIONS.get(token);
        return s != null && s.expiresAt() > System.currentTimeMillis();
    }
}
```

You should find at least four problems. Then answer: how would you test that a session expires after exactly one hour, without waiting an hour?""",
                    ),
                ],
                [
                    "A seam is any place a test can substitute behaviour without editing the class.",
                    "Prefer fakes to mocks: fakes assert outcomes, mocks assert structure and break on refactor.",
                    "Statics, new on externals, real time, randomness and busy constructors kill testability.",
                    "Push decisions into pure objects and keep I/O in thin adapters at the edge.",
                    "If you cannot describe the test, the design is not finished.",
                ],
                [
                    "How would you unit test this class?",
                    "When do you use a mock rather than a fake?",
                    "How do you test behaviour that depends on the current time?",
                    "What specifically makes a class hard to test?",
                ],
            ),
        ],
    )


# ---------------------------------------------------------------------------
# Module 3 — Creational patterns
# ---------------------------------------------------------------------------


def _factory_topic() -> dict:
    return _ood_topic(
        "factory-pattern",
        "Factory Patterns",
        "Simple factory, factory method and abstract factory — what each one hides and when hiding it is worth a class.",
        "MEDIUM",
        9,
        [
            OD(
                "factory-pattern",
                "Factory Pattern",
                "Moving the decision of which class to build out of the caller.",
                12,
                "A factory exists for one reason: the caller should not know which concrete class it is getting. Everything else — the three variants, the naming, the debates — follows from that single purpose. Interviewers ask about factories constantly because the pattern is easy to name and easy to over-apply, so the question separates people who know when to use it.",
                [
                    (
                        "Why It Matters",
                        """`new StripeGateway(key)` in the middle of your checkout logic is a hard dependency on a vendor. `new` is the one expression in Java you cannot override, intercept or substitute — it names a concrete class and there is no seam.

A factory replaces that expression with a method call. Once construction goes through a method, it can be overridden, injected, cached, pooled, validated or configured. That is the point.

But there is an important second answer that a lot of candidates miss: **if all you need is a seam, dependency injection is usually the better tool.** A factory earns its place when the *decision* of which type to build is real logic — driven by input, configuration or state — rather than a fixed choice made once at startup.

> Memory cue: inject when the choice is made once at wiring time; use a factory when the choice depends on data at call time.""",
                    ),
                    (
                        "Mental Model",
                        """Three things share the name, and interviewers do distinguish them.

| Variant | Shape | Chooses based on | Typical use |
| --- | --- | --- | --- |
| **Simple factory** | One static or instance method with a switch | An argument | Mapping a type code to a class |
| **Factory method** | An abstract method subclasses override | The subclass you are in | Frameworks; template method's partner |
| **Abstract factory** | An interface that creates a *family* of related products | The factory implementation chosen at wiring | Cross-platform or cross-vendor families |

Simple factory is not one of the original Gang of Four patterns and is by far the most used. Say that if asked — it is accurate and shows you know the catalogue rather than just the word.""",
                    ),
                    (
                        "How It Works",
                        """### Simple factory: one decision, one place

```java
public final class NotificationChannels {
    private final Map<ChannelType, Supplier<Channel>> registry;

    public Channel create(ChannelType type) {
        Supplier<Channel> supplier = registry.get(type);
        if (supplier == null) throw new UnknownChannel(type);
        return supplier.get();
    }
}
```

The registry map is better than a `switch` for one reason: adding a channel becomes a registration rather than an edit to a method every caller depends on. The knowledge of the full set still exists — it has just moved to one composable place.

### Factory method: the subclass decides

```java
abstract class Dialog {
    protected abstract Button createButton();      // the factory method

    void render() {
        Button button = createButton();
        button.onClick(this::close);
        button.draw();
    }
}

final class WebDialog extends Dialog {
    protected Button createButton() { return new HtmlButton(); }
}
```

`Dialog` owns the algorithm and defers one construction step. This is template method with the varying step being an object creation, and it is why the two patterns are usually taught together.

### Abstract factory: a family that must match

The distinguishing feature is that the products have to be consistent with each other.

```java
interface UiFactory {
    Button button();
    Checkbox checkbox();
    Menu menu();
}

final class MacUiFactory implements UiFactory { /* returns Mac widgets */ }
final class WindowsUiFactory implements UiFactory { /* returns Windows widgets */ }
```

A caller holding a `UiFactory` cannot accidentally pair a Mac button with a Windows checkbox — the factory guarantees the set. That guarantee is the entire reason abstract factory exists, and it is the answer to "how is this different from three simple factories?"

### Static factory methods on the type itself

Not a Gang of Four pattern, but the most common form in modern Java and worth knowing by name.

```java
public record Money(long amountCents, Currency currency) {
    public static Money ofDollars(long dollars) { return new Money(dollars * 100, USD); }
    public static Money zero(Currency currency) { return new Money(0, currency); }
}
```

Advantages over a constructor: it has a name, it may return a cached instance, and it can return a subtype. `List.of`, `Optional.of` and `Integer.valueOf` all work this way. Mentioning `Integer.valueOf` caching small values is a good concrete example.""",
                    ),
                    (
                        "Example",
                        """A document parser, showing when the factory is genuinely earning its keep.

```java
public interface DocumentParser {
    Document parse(InputStream in);
}

public final class ParserFactory {
    private final Map<String, Supplier<DocumentParser>> byExtension = Map.of(
        "csv",  CsvParser::new,
        "json", JsonParser::new,
        "xml",  XmlParser::new
    );

    public DocumentParser forFile(String filename) {
        String ext = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
        Supplier<DocumentParser> supplier = byExtension.get(ext);
        if (supplier == null) throw new UnsupportedFormat(ext);
        return supplier.get();
    }
}
```

This is a real factory rather than disguised injection, because the choice depends on the filename at call time — the caller cannot have been wired with the right parser in advance.

Contrast with the case where a factory adds nothing:

```java
// There is exactly one implementation and the choice never varies.
class GatewayFactory {
    static PaymentGateway create() { return new StripeGateway(key); }
}
```

Here the factory is a `new` with extra steps. Injecting `PaymentGateway` into the constructor does the same job with less code. Being able to point at that distinction is what the question is really testing.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Mapping a runtime value — file extension, message type, country code — to an implementation
- Framework extension points where a subclass supplies the concrete type
- Object pools and caches, where construction may return an existing instance
- Families of related products that must not be mixed, which is abstract factory's niche""",
                    ),
                    (
                        "Trade-offs",
                        """- **A factory is an extra class and an extra hop.** For one implementation it is pure cost.
- **Simple factory concentrates change.** Adding a type still edits one place; a registry moves that to a registration, which is better but not free.
- **Abstract factory is rigid about the product set.** Adding a fourth product means changing the interface and every implementation. Adding a new *family* is cheap; adding a new *product* is expensive.
- **Static factory methods cannot be injected or overridden.** Convenient and a seam you do not have — fine for value objects, wrong for anything that touches I/O.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Writing a factory for a class with one implementation that never varies
- Using a factory where constructor injection would be simpler and give a real seam
- A god factory that constructs twenty unrelated types and must change for all of them
- Confusing abstract factory with factory method in the definition
- Hiding heavy work — connecting, reading files — inside a factory method that looks cheap
- Static factories on classes that need to be faked in tests""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"Factory method versus abstract factory?"** Factory method is a single overridable creation step inside a class that owns an algorithm. Abstract factory is an object that creates a whole family of related products that must be consistent with each other.

**"When would you not use a factory?"** When the implementation is chosen once at startup — inject it instead. A factory earns its keep when the choice depends on runtime data.

**"How do you avoid the switch inside a simple factory?"** Register suppliers in a map, so adding a type is a registration rather than a modification. Something must still know the full set; the goal is that it is one small composable place.

**"What is a static factory method and why prefer it to a constructor?"** A named static creator. It can have a meaningful name, return a cached instance, and return a subtype — `Integer.valueOf` caches small values, which a constructor cannot do.""",
                    ),
                    (
                        "Interview Tip",
                        """Say what the factory is hiding and why hiding it matters. If you cannot, the factory is probably unnecessary — and noticing that is a better answer than adding one.

> "I want a factory here because the parser depends on the file extension, which we only know at call time. If instead we had one parser chosen by config at startup, I would skip the factory and inject the parser — a factory for a fixed choice is just `new` with more ceremony."

Volunteering the case where you would *not* use the pattern is what separates a candidate who understands it from one who memorised it.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """A payment system supports card, wallet and bank transfer. Each needs different configuration, and the choice comes from the request body.

1. Which factory variant fits, and why not the other two?
2. Where does each provider's configuration live?
3. Now the requirement changes: a new provider must be addable without redeploying. What changes?

Question three is the one that distinguishes a registry from a switch.""",
                    ),
                ],
                [
                    "A factory exists so the caller does not know the concrete class it receives.",
                    "Inject when the choice is fixed at wiring time; use a factory when it depends on runtime data.",
                    "A registry of suppliers beats a switch: adding a type becomes a registration.",
                    "Abstract factory guarantees a consistent family; that guarantee is its whole purpose.",
                    "Static factory methods have names, can cache, and can return a subtype.",
                ],
                [
                    "Factory method versus abstract factory — what is the difference?",
                    "When would you not use a factory?",
                    "How do you avoid the growing switch inside a simple factory?",
                    "What does a static factory method give you that a constructor cannot?",
                ],
            ),
        ],
    )


def _builder_singleton_topic() -> dict:
    return _ood_topic(
        "builder-pattern",
        "Builder & Singleton",
        "Assembling complex objects safely, and the pattern interviewers most want to hear you criticise.",
        "MEDIUM",
        10,
        [
            OD(
                "builder-pattern",
                "Builder & Singleton",
                "Assembling complex objects safely, and the pattern interviewers most want to hear you criticise.",
                12,
                "Builder and singleton sit at opposite ends of the reputation scale. Builder is almost always a good idea when it applies; singleton is the pattern most likely to be a design smell, and interviewers ask about it specifically to see whether you will defend it uncritically.",
                [
                    (
                        "Why It Matters",
                        """**Builder** solves two real problems. Telescoping constructors — five overloads with different parameter counts — are unreadable at the call site, and an object assembled through setters is invalid between the first setter and the last. A builder gives you named parameters and a single validation point.

**Singleton** guarantees one instance and gives global access to it. The guarantee is occasionally useful; the global access is what causes the damage. A singleton is a hidden dependency, a shared mutable state hazard, and an untestable seam all at once. When an interviewer asks you to implement one, they usually also want to hear the caveats.

> Memory cue: builder is about constructing safely. Singleton is about controlling instances — and the global access it usually comes with is a separate, worse decision.""",
                    ),
                    (
                        "Mental Model",
                        """**Builder** applies when: many parameters, several optional, and validation that spans fields. Roughly four or more parameters is the usual threshold.

**Singleton** decision table:

| Need | Better answer than a singleton |
| --- | --- |
| One instance shared by the app | Create one in the composition root and inject it |
| Expensive object created once | Same — build it once at startup, inject the reference |
| Global convenience access | Almost never the right requirement; it is what makes testing hard |
| Genuinely one because the resource is one | Singleton is defensible: a hardware device, a process-wide cache |

The honest summary: **you usually want one instance, not a singleton.** One instance is a lifecycle decision that injection handles. A singleton adds global access nobody asked for.""",
                    ),
                    (
                        "How It Works",
                        """### Builder, with validation in build

```java
public final class HttpRequest {
    private final URI url;
    private final String method;
    private final Duration timeout;
    private final Map<String, String> headers;

    private HttpRequest(Builder b) {
        this.url = b.url;
        this.method = b.method;
        this.timeout = b.timeout;
        this.headers = Map.copyOf(b.headers);
    }

    public static Builder to(URI url) { return new Builder(url); }

    public static final class Builder {
        private final URI url;
        private String method = "GET";
        private Duration timeout = Duration.ofSeconds(30);
        private final Map<String, String> headers = new LinkedHashMap<>();

        private Builder(URI url) { this.url = Objects.requireNonNull(url); }

        public Builder method(String method) { this.method = method; return this; }
        public Builder timeout(Duration timeout) { this.timeout = timeout; return this; }
        public Builder header(String name, String value) { headers.put(name, value); return this; }

        public HttpRequest build() {
            if (timeout.isNegative() || timeout.isZero()) {
                throw new IllegalArgumentException("timeout must be positive");
            }
            if (method.equals("POST") && !headers.containsKey("Content-Type")) {
                throw new IllegalStateException("POST requires Content-Type");
            }
            return new HttpRequest(this);
        }
    }
}
```

Three design points worth saying out loud. Required parameters go in the static entry point, not in a setter — so you cannot forget them. Cross-field validation lives in `build()`, which is the only place that sees the whole object. And the built object is immutable, so a builder cannot be used to mutate something already handed out.

### Singleton, done correctly and then argued against

The correct lazy form in Java is the holder idiom:

```java
public final class Registry {
    private Registry() {}

    private static final class Holder {
        static final Registry INSTANCE = new Registry();
    }

    public static Registry getInstance() { return Holder.INSTANCE; }
}
```

The JVM guarantees the holder class is initialised once, lazily, and thread-safely. No synchronisation, no double-checked locking, no `volatile`.

The enum form is shorter and also handles serialisation and reflection attacks:

```java
public enum Registry {
    INSTANCE;
    public void register(String key, Object value) { /* ... */ }
}
```

Now the criticism, which is the part interviewers actually want:

- **Hidden dependency.** A class calling `Registry.getInstance()` has a dependency invisible in its constructor.
- **Untestable.** Tests cannot substitute it, and state leaks between tests because the instance outlives them.
- **Shared mutable state.** If it holds anything mutable, every thread races on it.
- **Initialisation order.** Lazy singletons that depend on each other produce startup order bugs that are painful to diagnose.

### Double-checked locking, for completeness

```java
private static volatile Registry instance;

public static Registry getInstance() {
    Registry result = instance;
    if (result == null) {
        synchronized (Registry.class) {
            if (instance == null) instance = new Registry();
            result = instance;
        }
    }
    return result;
}
```

The `volatile` is not optional. Without it, another thread can observe a non-null reference to a partially constructed object because the constructor's writes may be reordered with the reference assignment. Being able to explain *why* `volatile` is required is a classic senior Java question — but the correct closing line is that you would use the holder idiom instead.""",
                    ),
                    (
                        "Example",
                        """Replacing a singleton with an injected single instance — the move interviewers want to see.

```java
// Before: hidden dependency, no seam, test pollution.
class OrderService {
    void place(Order o) {
        ConfigManager.getInstance().get("payments.enabled");
        MetricsRegistry.getInstance().increment("orders.placed");
    }
}
```

```java
// After: one instance still, but it arrives through the constructor.
final class OrderService {
    private final Config config;
    private final Metrics metrics;

    OrderService(Config config, Metrics metrics) {
        this.config = config;
        this.metrics = metrics;
    }
}

// Composition root - still exactly one of each, and now visible.
Config config = Config.load(env);
Metrics metrics = new PrometheusMetrics(registry);
OrderService service = new OrderService(config, metrics);
```

The instance count did not change. What changed is that the dependency is declared, the test can pass a fake, and no state survives between tests. That is the whole argument, and it fits in three sentences.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Builder: request objects, configuration, test data, any type with four or more parameters
- Builder: immutable objects that need cross-field validation
- Singleton: genuinely process-unique resources such as a hardware handle
- Singleton via enum: a stateless strategy where an instance carries no data""",
                    ),
                    (
                        "Trade-offs",
                        """- **Builders are verbose.** Roughly double the code of a constructor. Records and named parameters cover the simple cases; keep builders for genuinely complex construction.
- **A builder can be left half-configured.** Only `build()` validates, so nothing stops a caller holding a builder in an incomplete state. Requiring mandatory fields in the entry point limits the damage.
- **Singleton trades convenience for testability.** Every `getInstance()` saves a constructor parameter and costs a seam.
- **Enum singletons cannot take constructor parameters at runtime.** Fine when stateless, unusable when the instance needs configuration.""",
                    ),
                    (
                        "Common Mistakes",
                        """- A builder whose `build()` can return an invalid object because validation lives in the setters
- Making the built object mutable, which defeats most of the reason for the builder
- Implementing singleton with unsynchronised lazy initialisation, which is a race
- Double-checked locking without `volatile`, which is subtly broken rather than obviously broken
- Using a singleton to hold mutable application state and discovering it in a concurrency bug
- Defending singleton without acknowledging the testability cost, which reads as inexperience""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"Implement a thread-safe singleton."** Holder idiom for lazy initialisation, or an enum. Both are thread-safe without explicit synchronisation, and the enum also resists serialisation and reflection attacks.

**"Why is `volatile` needed in double-checked locking?"** Without it, the write publishing the reference can be reordered before the constructor's writes, so another thread may see a non-null but partially initialised object.

**"Why is singleton considered an anti-pattern?"** Because of the global access, not the single instance. It hides dependencies, prevents substitution in tests, leaks state between tests, and invites shared mutable state.

**"When is a builder worth it?"** Four or more parameters, several optional, or validation that spans fields. Below that a constructor or a record is clearer.

**"How do you get one instance without a singleton?"** Construct it once in the composition root and inject the same reference everywhere. Same instance count, declared dependencies, testable.""",
                    ),
                    (
                        "Interview Tip",
                        """If asked to implement a singleton, implement it *and* offer the alternative. Doing only the first reads as junior; doing only the second reads as evasive.

> "Here is the holder idiom — lazy, thread-safe, no synchronisation because the JVM guarantees class initialisation happens once. That said, in this design I would create one `Config` in main and inject it. I get the same single instance, the dependency shows up in the constructor, and my tests can pass a fake without any global state to reset."

You have demonstrated the mechanics and the judgement, which is what the question is for.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Design a `Pizza` builder. Constraints: size is required; up to five toppings; extra cheese only allowed on medium or large; a gluten-free base excludes two of the toppings.

1. Which constraints belong in the entry point, which in the setters, and which in `build()`?
2. Now the shop wants a `DatabaseConnectionPool` that must have exactly one instance. Write the two-sentence argument for injecting one instance instead of making it a singleton, and name the one circumstance where you would still use a singleton.""",
                    ),
                ],
                [
                    "Use a builder at four or more parameters, several optional, or cross-field validation.",
                    "Required parameters belong in the entry point; whole-object validation belongs in build().",
                    "The holder idiom gives lazy, thread-safe singletons with no synchronisation.",
                    "Double-checked locking without volatile can publish a partially constructed object.",
                    "You usually want one instance, not a singleton — construct once and inject it.",
                ],
                [
                    "Implement a thread-safe lazy singleton and explain why it is safe.",
                    "Why does double-checked locking require volatile?",
                    "Why is singleton often called an anti-pattern?",
                    "How do you get exactly one instance without global access?",
                ],
            ),
        ],
    )


# ---------------------------------------------------------------------------
# Module 4 — Structural patterns
# ---------------------------------------------------------------------------


def _adapter_facade_proxy_topic() -> dict:
    return _ood_topic(
        "adapter-facade-proxy",
        "Adapter, Facade & Proxy",
        "Three patterns that all wrap something — and the different reason each one exists.",
        "MEDIUM",
        11,
        [
            OD(
                "adapter-facade-proxy",
                "Adapter Pattern",
                "Making an incompatible interface fit, and keeping vendor types out of your domain.",
                11,
                "An adapter converts one interface into another so two things that were not designed together can work together. It is the pattern you use every time you integrate a third-party library, and it is the practical mechanism behind dependency inversion — the adapter is what lets your domain define the contract and the vendor satisfy it.",
                [
                    (
                        "Why It Matters",
                        """Third-party libraries define interfaces that suit the library, not you. Their method names, their exception types, their data classes. If your domain code calls them directly, all of that leaks inward: `SQLException` in business logic, a vendor enum in your domain model, a client class you cannot fake in a test.

An adapter is the wall. Your domain declares the interface it wants; the adapter implements it by translating to and from the vendor. Three things become true immediately: the vendor can be swapped, the domain can be tested with a fake, and a vendor upgrade touches one file.

> Memory cue: adapter changes the *shape* of an interface. It does not add behaviour and it does not simplify a subsystem — those are decorator and facade.""",
                    ),
                    (
                        "Mental Model",
                        """Three wrapping patterns, distinguished by intent.

| Pattern | Same interface as the wrapped thing? | Purpose |
| --- | --- | --- |
| **Adapter** | No — that is the point | Convert an incompatible interface into the one you need |
| **Decorator** | Yes | Add behaviour while keeping the contract |
| **Proxy** | Yes | Control access: lazy, remote, caching, permission |
| **Facade** | No — a new, simpler one | Hide a complex subsystem behind a small surface |

They look identical in a class diagram. Interviewers ask you to distinguish them because the difference is intent, not structure — and being able to say that is itself the answer.""",
                    ),
                    (
                        "How It Works",
                        """### Object adapter — composition

```java
// What our domain wants.
public interface PaymentGateway {
    Receipt charge(PaymentMethod method, Money amount);
}

// What the vendor gives us: different names, different types, different exceptions.
// stripe.Charge create(Map<String, Object> params) throws StripeException

public final class StripeGatewayAdapter implements PaymentGateway {
    private final StripeClient client;

    public Receipt charge(PaymentMethod method, Money amount) {
        try {
            var params = Map.<String, Object>of(
                "amount", amount.amountCents(),
                "currency", amount.currency().code().toLowerCase(),
                "source", method.token()
            );
            var charge = client.charges().create(params);
            return new Receipt(new TransactionId(charge.getId()), amount);
        } catch (StripeCardException e) {
            throw new PaymentDeclined(DeclineReason.from(e.getCode()), e);
        } catch (StripeException e) {
            throw new GatewayUnavailable(e);
        }
    }
}
```

Look at what crosses the boundary. Going in: our `Money` and `PaymentMethod` become the vendor's map. Coming out: their `Charge` becomes our `Receipt`, and their exceptions become ours. Nothing vendor-shaped escapes.

This is composition — the adapter *holds* the adaptee. Java also allows a class adapter via inheritance, but it requires extending the vendor class and inherits everything else it has, so object adapters are the default.

### Two-way adapters and legacy code

Adapters also let new and old code coexist during a migration. The new domain defines the interface; one adapter wraps the legacy implementation and another wraps the new one. Callers are switched over gradually and the legacy adapter is deleted last. Mentioning this in an interview signals experience with real migrations rather than greenfield design.

### Where the adapter lives

This matters as much as the code. The interface belongs in the domain package; the adapter belongs in an adapters or infrastructure package that depends on the domain. If the adapter and interface sit together next to the vendor, you have written a wrapper, not an inversion.

```
domain/      PaymentGateway.java   (interface, no vendor imports)
adapters/    StripeGatewayAdapter.java
```

### The anti-corruption layer

The same idea at module scale. When integrating a system whose model conflicts with yours — a legacy ERP, a partner API — you build a translation layer whose entire job is to stop their concepts from contaminating your model. Naming this term is a strong signal in a design discussion, because it shows you think about model integrity and not just about compilation.""",
                    ),
                    (
                        "Example",
                        """A notification design where three vendors present three completely different shapes.

```java
public interface Notifier {
    void send(Recipient to, Message message);
}

public final class TwilioSmsNotifier implements Notifier {
    private final TwilioRestClient twilio;
    private final PhoneNumber from;

    public void send(Recipient to, Message message) {
        try {
            com.twilio.rest.api.v2010.account.Message
                .creator(new PhoneNumber(to.phone()), from, message.body())
                .create(twilio);
        } catch (ApiException e) {
            throw new NotificationFailed(to, e);
        }
    }
}

public final class SesEmailNotifier implements Notifier {
    private final SesClient ses;

    public void send(Recipient to, Message message) {
        var request = SendEmailRequest.builder()
            .destination(d -> d.toAddresses(to.email()))
            .message(m -> m.subject(s -> s.data(message.subject()))
                           .body(b -> b.text(t -> t.data(message.body()))))
            .build();
        try {
            ses.sendEmail(request);
        } catch (SdkException e) {
            throw new NotificationFailed(to, e);
        }
    }
}
```

The domain sees one two-argument method. Everything asymmetric — builders, fluent AWS lambdas, Twilio's static creator, two unrelated exception hierarchies — is absorbed at the edge. Adding a third vendor is a new file in `adapters` and one line in the composition root.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Wrapping any third-party SDK: payments, email, SMS, storage, maps, search
- Migrating from a legacy implementation while both run side by side
- Making an existing class fit an interface you cannot change, such as a framework callback
- Translating between a partner's data model and your own at an integration boundary""",
                    ),
                    (
                        "Trade-offs",
                        """- **An extra layer per integration.** More files and one more hop when reading a stack trace.
- **Lowest-common-denominator interfaces.** If your `Notifier` only has `send`, you cannot use a vendor's rich templating without widening the contract or leaking their type.
- **Translation can lose information.** Vendor error codes collapse into your smaller set of exceptions; keep the original as the cause so nothing is lost in a log.
- **Sometimes the vendor interface is fine.** Adapting `java.time` or a stable, well-designed library buys nothing. Adapt across boundaries you actually want to defend.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Letting vendor exceptions or data classes escape through the adapter
- Putting the interface in the adapter package, so the domain still depends outward
- Putting business logic in the adapter, which then needs the vendor to be tested
- Designing the interface by copying the vendor's method names, which defeats the purpose
- Swallowing the original exception instead of keeping it as the cause
- Building an adapter for a stable standard-library type, adding a hop for nothing""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"Adapter versus decorator?"** An adapter changes the interface and adds no behaviour. A decorator keeps the interface and adds behaviour. Same diagram, opposite intent.

**"Where do you put the interface?"** In the domain module. The adapter lives with the infrastructure and depends inward. If the interface ships with the adapter, there is no inversion.

**"What if the vendor supports something your interface does not?"** Either widen the interface deliberately, or add a capability interface only some adapters implement. Never leak the vendor type to get at it.

**"How do you test an adapter?"** Not with unit tests over mocks of the SDK — that tests your mock. Use the vendor's sandbox or a recorded HTTP fixture in an integration test, and keep the adapter thin enough that there is little logic to test.""",
                    ),
                    (
                        "Interview Tip",
                        """Say what the adapter keeps out, not just what it wraps. That framing is the one interviewers score.

> "I will define `PaymentGateway` in the domain with our own `Money` and `Receipt` types, and put a Stripe adapter in the infrastructure package. The reason is that nothing Stripe-shaped — their exception hierarchy, their id format, their map-based API — should ever appear in an order rule. It also means the order tests need a two-line fake instead of an API key."

You have named the pattern, the placement and the two concrete benefits.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Your app must support two mapping providers. Google returns `LatLng` and throws `ApiException`; the in-house service returns `double[]` and returns null on failure.

1. Define the domain interface, including how failure is signalled.
2. Sketch both adapters.
3. Google supports traffic-aware routing and the in-house one does not. How do you expose that without leaking Google types into the domain?

Question three is where most designs leak.""",
                    ),
                ],
                [
                    "An adapter converts an interface; it adds no behaviour of its own.",
                    "Nothing vendor-shaped — types, exceptions, ids — should cross the adapter inward.",
                    "The interface belongs to the domain; the adapter belongs to infrastructure.",
                    "Keep adapters thin: logic inside one can only be tested with the vendor present.",
                    "An anti-corruption layer is this idea applied at module scale.",
                ],
                [
                    "How is an adapter different from a decorator?",
                    "Which package should the interface live in, and why?",
                    "What do you do when one vendor supports a capability others do not?",
                    "How would you test an adapter?",
                ],
            ),
            OD(
                "facade-pattern",
                "Facade Pattern",
                "One simple entry point over a complicated subsystem, and the line between a facade and a god class.",
                10,
                "A facade gives a caller one small, task-shaped interface to a subsystem that has many moving parts. It is the pattern behind almost every well-designed service class, and it is also the pattern most likely to grow into the god class you were trying to avoid — so knowing where the line is matters more than knowing the definition.",
                [
                    (
                        "Why It Matters",
                        """Some tasks genuinely require coordinating five objects in a specific order. Without a facade, every caller learns that order, and every caller gets it slightly wrong.

```java
// Every caller must know all five steps and the correct sequence.
var reservation = inventory.hold(showId, seats);
var price = pricing.quote(showId, seats, customer);
var charge = payments.charge(customer.method(), price);
var booking = bookings.confirm(reservation, charge);
notifier.notifyUser(customer.id(), Message.confirmed(booking));
```

That is a workflow, not an API. A facade names it once — `bookSeats(...)` — and the sequence has exactly one home. The subsystem stays decomposed for the people who need the parts, and callers get a single call.

> Memory cue: a facade simplifies. It does not restrict. The subsystem is still there for anyone who needs it directly.""",
                    ),
                    (
                        "Mental Model",
                        """A facade is justified when all three of these hold:

1. A task requires coordinating several objects.
2. The coordination order is non-obvious or easy to get wrong.
3. More than one caller needs the same task.

If only one caller needs it, put the sequence in that caller. If the objects do not need coordinating, the facade is just delegation with extra indirection.

| | Facade | God class |
| --- | --- | --- |
| Contains | Orchestration only | Orchestration plus business rules |
| Methods | A few, task-shaped | Many, unrelated |
| Reason to change | The workflow changes | Everything changes it |
| Underlying parts | Still usable directly | Hidden or absorbed |

The difference is one line: **a facade delegates, a god class decides.** """,
                    ),
                    (
                        "How It Works",
                        """### The facade holds sequence, not rules

```java
public final class BookingFacade {
    private final SeatInventory inventory;
    private final PricingService pricing;
    private final PaymentGateway payments;
    private final Bookings bookings;
    private final Notifier notifier;

    public BookingResult bookSeats(ShowId show, List<Seat> seats, Customer customer) {
        Reservation held = inventory.hold(show, seats)
            .orElseThrow(() -> new SeatsUnavailable(seats));
        try {
            Money price = pricing.quote(show, seats, customer);
            Receipt receipt = payments.charge(customer.method(), price);
            Booking booking = bookings.confirm(held, receipt);
            notifier.notifyUser(customer.id(), Message.confirmed(booking));
            return BookingResult.confirmed(booking);
        } catch (PaymentDeclined e) {
            inventory.release(held);
            return BookingResult.declined(e.reason());
        }
    }
}
```

Every line is a delegation or a control-flow decision about the sequence. There is no pricing arithmetic, no seat-adjacency rule, no discount logic. Those live in the components. That discipline is what keeps a facade from growing.

### Facades do not hide the subsystem

The reporting team still calls `bookings` directly for its queries. The admin console still calls `inventory.release` for a manual override. The facade is a convenience for one common task, not a mandatory gate. If you find yourself adding methods to the facade so that other callers do not have to touch the subsystem, it is turning into a god class.

### Where facades appear without the name

- An application-service or use-case class in a layered architecture is a facade.
- A `@RestController` method that orchestrates three services is a facade, usually a badly placed one.
- An SDK's top-level client class over its transport, serialisation and retry internals.

### Facade versus adapter versus mediator

- **Adapter:** one thing, wrong shape, converted.
- **Facade:** several things, complicated, simplified.
- **Mediator:** several things that need to talk to each other, and the mediator stops them coupling directly. A facade is one-directional; a mediator sits in the middle of an N-way conversation.

That three-way distinction is a common interview question and the answers are short enough to say verbatim.""",
                    ),
                    (
                        "Example",
                        """A facade that has gone wrong, and the fix.

```java
// God class wearing a facade's name: it makes decisions instead of delegating.
class OrderFacade {
    OrderResult place(Order order, Customer customer) {
        Money subtotal = Money.ZERO;
        for (Line l : order.lines()) subtotal = subtotal.plus(l.price().times(l.quantity()));
        if (customer.tier() == GOLD) subtotal = subtotal.times(0.9);      // pricing rule
        if (subtotal.greaterThan(Money.ofDollars(10_000))) {              // fraud rule
            fraudQueue.add(order);
            return OrderResult.underReview();
        }
        if (order.shippingCountry().equals("US")) subtotal = subtotal.times(1.07);  // tax rule
        ...
    }
}
```

Three business rules have migrated into the facade. Now a tax change and a fraud-threshold change collide in the same file.

```java
// Fixed: each rule has its own home, and the facade only sequences them.
public final class PlaceOrder {
    public OrderResult place(Order order, Customer customer) {
        Money price = pricing.quote(order, customer);
        if (fraudPolicy.requiresReview(order, price)) {
            fraudQueue.add(order);
            return OrderResult.underReview();
        }
        Receipt receipt = payments.charge(customer.method(), price);
        return OrderResult.placed(orders.record(order, receipt));
    }
}
```

The test for the ten-thousand-dollar threshold now lives with `fraudPolicy` and needs no payment gateway at all. That is the practical payoff of keeping the facade thin.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Application-service or use-case classes that orchestrate a domain
- SDK and library entry points that hide transport, retry and serialisation
- Wrapping a legacy subsystem behind a small modern interface during a migration
- Any workflow with a required call order that more than one caller performs""",
                    ),
                    (
                        "Trade-offs",
                        """- **A facade can become a bottleneck for change.** Every new use case wants a method on it, and the class grows.
- **It hides the subsystem's capability.** A caller with an unusual need may not realise the parts are available.
- **It adds a layer.** For a two-step sequence used once, the caller should just do the two steps.
- **Transactions and error handling concentrate here.** That is often correct — one place to decide what a partial failure means — but it makes the class important and worth reviewing carefully.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Putting business rules in the facade instead of delegating to the components
- Growing it until every method in the subsystem has a pass-through on the facade
- Making the facade the only way in and then blocking legitimate direct use
- Confusing it with adapter — a facade defines a new simpler interface, it does not convert an existing one
- Wrapping a single class, which is delegation, not a facade
- Naming it `Manager` and letting the name authorise the sprawl""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"Facade versus adapter?"** Adapter converts one interface to another with no simplification. Facade invents a new, smaller interface over several collaborating objects.

**"When does a facade become a god class?"** When it starts making decisions rather than sequencing them. If the business rules would need to move with it, it is no longer a facade.

**"Should the facade be the only way to reach the subsystem?"** No. It is a convenience for the common path. Other callers with legitimate needs should still be able to use the parts.

**"Where do transactions belong?"** Usually at the facade, because it is the unit of work boundary — one place decides what commits together and what a partial failure means.""",
                    ),
                    (
                        "Interview Tip",
                        """Introduce a facade by naming the use case, and say explicitly what will not be in it.

> "I will add a `PlaceOrder` use-case class that sequences pricing, fraud check, payment and persistence. It holds the order of those steps and the compensation if payment fails — and no pricing or fraud logic, because those belong in their own policies where they can be tested without a gateway."

The second half is what tells the interviewer this will not become a god class in six months.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """A file upload must: validate the type, scan for viruses, generate a thumbnail, store the original in object storage, write a metadata row, and publish an event.

1. Design the facade method signature.
2. Which of the six steps could fail in a way that requires undoing earlier ones, and what does the facade do about it?
3. Name one piece of logic that a careless implementation would put in the facade, and say where it belongs instead.""",
                    ),
                ],
                [
                    "A facade sequences collaborators; a god class decides business rules.",
                    "Justified when a multi-object task has a non-obvious order and several callers.",
                    "The subsystem stays directly usable — a facade simplifies without restricting.",
                    "Adapter converts an interface; facade invents a smaller one over many.",
                    "The facade is usually the right place for the transaction and compensation boundary.",
                ],
                [
                    "How is a facade different from an adapter?",
                    "When has a facade turned into a god class?",
                    "Should all access go through the facade?",
                    "Where do you put transaction boundaries in a layered design?",
                ],
            ),
            OD(
                "proxy-pattern",
                "Proxy Pattern",
                "Same interface, controlled access — lazy loading, caching, remote calls and permission checks.",
                10,
                "A proxy implements the same interface as the object it stands in for, so callers cannot tell the difference, and uses that position to control access: to defer creation, to cache, to check a permission, or to hide the fact that the real object is on another machine. It is the structural basis of most framework magic you have used.",
                [
                    (
                        "Why It Matters",
                        """Proxies are how frameworks add behaviour to code that does not know about the framework. Spring's `@Transactional` works because your bean is wrapped in a proxy that opens a transaction before your method and commits after. Hibernate's lazy loading works because the collection you hold is a proxy that fetches on first access. Mockito builds proxies. RPC clients are proxies.

Knowing this means you can answer a whole family of interview questions — "why doesn't `@Transactional` work when I call the method from inside the same class?" has one answer: the call did not go through the proxy.

> Memory cue: a proxy has the same interface as the real thing and controls when and whether you reach it.""",
                    ),
                    (
                        "Mental Model",
                        """Four kinds, one structure.

| Kind | Controls | Example |
| --- | --- | --- |
| **Virtual** | When the real object is created | Lazy-loaded entity or image |
| **Remote** | Where the object lives | RPC or REST client stub |
| **Protection** | Who may call | Permission checks before delegating |
| **Caching** | Whether the call happens at all | Memoising expensive results |

And the distinction interviewers push on:

- **Proxy:** same interface, controls access. The client would behave identically without it, only slower or less safe.
- **Decorator:** same interface, adds behaviour. The client gets something extra.
- **Adapter:** different interface, converts.

The boundary between proxy and decorator is genuinely blurry — a caching proxy adds behaviour too. The honest answer is that the distinction is intent: a proxy manages *access to* the subject, a decorator *augments* it.""",
                    ),
                    (
                        "How It Works",
                        """### Virtual proxy: defer the expensive part

```java
public interface Image {
    void render();
    int width();
}

public final class LazyImage implements Image {
    private final Path path;
    private HighResImage loaded;          // created only when needed

    public LazyImage(Path path) { this.path = path; }

    private HighResImage load() {
        if (loaded == null) loaded = HighResImage.read(path);
        return loaded;
    }

    public void render() { load().render(); }
    public int width()  { return load().width(); }
}
```

A thousand thumbnails can exist without a thousand decoded bitmaps. Note the thread-safety hole: two threads can both see `loaded == null`. If the proxy is shared, this needs a lock or a `volatile` double-check — a good thing to flag unprompted.

### Protection proxy: check before delegating

```java
public final class AuthorizingDocuments implements Documents {
    private final Documents delegate;
    private final CurrentUser currentUser;

    public Document open(DocumentId id) {
        if (!currentUser.canRead(id)) throw new AccessDenied(currentUser.id(), id);
        return delegate.open(id);
    }

    public void delete(DocumentId id) {
        if (!currentUser.canAdmin(id)) throw new AccessDenied(currentUser.id(), id);
        delegate.delete(id);
    }
}
```

The domain implementation contains no authorisation code at all, and the check cannot be forgotten because it is in the only path callers have. That separation is the design argument.

### Caching proxy

```java
public final class CachingRates implements ExchangeRates {
    private final ExchangeRates delegate;
    private final Map<CurrencyPair, Cached> cache = new ConcurrentHashMap<>();
    private final Clock clock;
    private final Duration ttl;

    public Rate rateFor(CurrencyPair pair) {
        Cached hit = cache.get(pair);
        if (hit != null && hit.expiresAt().isAfter(clock.instant())) return hit.rate();
        Rate fresh = delegate.rateFor(pair);
        cache.put(pair, new Cached(fresh, clock.instant().plus(ttl)));
        return fresh;
    }
}
```

The consumer of `ExchangeRates` never learns that caching exists, and caching can be turned off by changing one line in the composition root.

### Dynamic proxies, and the self-invocation trap

Java can build proxies at runtime with `java.lang.reflect.Proxy` for interfaces, or with bytecode generation for classes. This is what frameworks use.

The consequence people hit in production:

```java
@Transactional
public void outer() { inner(); }        // the proxy wrapped outer(), not this call

@Transactional
public void inner() { /* NOT in a new transaction */ }
```

`this.inner()` bypasses the proxy entirely, because `this` is the real object, not the wrapper. Being able to explain that is a frequently asked Spring question and it is pure proxy mechanics.""",
                    ),
                    (
                        "Example",
                        """Composing proxies and decorators in the composition root.

```java
Documents documents =
    new AuthorizingDocuments(              // protection proxy - outermost, checks first
        new CachingDocuments(              // caching proxy
            new MetricsDocuments(          // decorator - adds timing
                new S3Documents(s3))),     // the real subject
        currentUser);
```

Order is a design decision worth narrating. Authorisation is outermost so an unauthorised caller never reaches the cache — put the cache outside and you can serve a document the caller is not allowed to see. Metrics sits innermost so it measures the real S3 call rather than cache hits.

An interviewer who sees you reason about wrapper order is seeing someone who has debugged this before.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Lazy initialisation of expensive objects, including ORM lazy loading
- Caching a slow or remote call without the consumer knowing
- Authorisation and rate limiting applied uniformly at a boundary
- Remote stubs, where a local object stands in for something across a network
- Framework cross-cutting concerns: transactions, retries, tracing""",
                    ),
                    (
                        "Trade-offs",
                        """- **Proxies hide cost.** A method that looks local may be a network call. That is convenient and it is how people write accidental N+1 queries.
- **Lazy proxies fail late.** The error appears at first use, far from the construction site, which makes stack traces confusing.
- **Caching proxies introduce staleness.** You now own a TTL and an invalidation story.
- **Dynamic proxies only intercept calls that go through them.** Self-invocation and final methods silently skip the wrapper.
- **Stack traces get deeper.** Several wrappers make debugging noisier.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Putting a caching proxy outside an authorisation proxy, so cached data leaks across users
- Lazy loading without thread safety on a shared proxy
- Caching with no invalidation or TTL and calling it done
- Expecting an annotation-driven proxy to intercept a call made through `this`
- Using a proxy where the caller genuinely needs to know — a slow remote call disguised as a getter
- Confusing proxy with decorator in the definition; the difference is access control versus augmentation""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"Proxy versus decorator?"** Both keep the interface. A proxy controls access to the subject — when, whether, by whom. A decorator adds behaviour the caller wants. The structure is identical; the intent differs.

**"How does `@Transactional` actually work?"** The container returns a proxy implementing the same interface. It opens a transaction, calls your method, and commits or rolls back. That is why calling the method through `this` does nothing — the call never reaches the proxy.

**"Where does a caching proxy go relative to authorisation?"** Inside it. Authorisation must run on every call; if the cache is outermost, a second user gets a cached answer without a permission check.

**"What is the risk of a virtual proxy?"** Deferred failure and hidden cost. The object may fail to load at first use rather than at construction, and a loop over proxies can quietly become a thousand queries.""",
                    ),
                    (
                        "Interview Tip",
                        """When you add a proxy, state the wrapping order and why. It is a small detail that demonstrates real operational thinking.

> "Authorisation goes outermost so no unauthorised request ever reaches the cache — otherwise one user's cached document could be served to another. Metrics goes innermost so the timings measure the actual storage call rather than cache hits. All three are wired in main, so the domain never knows any of them exist."

That answer contains a security bug you avoided, which is exactly the kind of thing that gets remembered.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """You have `UserRepository` backed by a slow remote service. You need caching, per-tenant authorisation, and metrics.

1. Write the wrapping order and justify each position.
2. Two threads request the same uncached user simultaneously. What happens, and how do you avoid a duplicate fetch?
3. A user's permissions are revoked while their data is cached. What breaks, and what is your invalidation strategy?""",
                    ),
                ],
                [
                    "A proxy shares the subject's interface and controls access to it.",
                    "Virtual, remote, protection and caching are the four kinds; the structure is identical.",
                    "Authorisation must wrap outside caching, or cached data leaks between users.",
                    "Annotation-driven proxies do not intercept calls made through `this`.",
                    "Proxies hide cost — which is convenient and is how N+1 queries happen.",
                ],
                [
                    "What distinguishes a proxy from a decorator?",
                    "Explain how a transactional annotation works, and why self-invocation fails.",
                    "Should caching sit inside or outside an authorisation proxy?",
                    "What are the risks of lazy loading through a virtual proxy?",
                ],
            ),
        ],
    )


def _decorator_topic() -> dict:
    return _ood_topic(
        "decorator-pattern",
        "Decorator & Composite",
        "Stacking behaviour around an object, and treating a tree of objects exactly like a single one.",
        "MEDIUM",
        12,
        [
            OD(
                "decorator-pattern",
                "Decorator Pattern",
                "Adding behaviour by wrapping, so combinations stay linear instead of exponential.",
                12,
                "A decorator implements the same interface as the thing it wraps, delegates to it, and does something extra before or after. It exists because inheritance cannot express combinations: three optional behaviours means eight subclasses and no way to choose at runtime. Java's I/O library is built on it, which makes it the easiest pattern to give a real example for.",
                [
                    (
                        "Why It Matters",
                        """Cross-cutting concerns — logging, caching, retry, metrics, compression, encryption, rate limiting — all have the same shape. They wrap an operation and do a little before and after. If you add them by subclassing, you get a class per combination.

Three concerns, subclassed:

```
LoggingRepo, CachingRepo, RetryingRepo,
LoggingCachingRepo, LoggingRetryingRepo, CachingRetryingRepo,
LoggingCachingRetryingRepo, ...
```

Seven classes for three concerns, and every one duplicates code. Decorated, it is three classes composed in any order at runtime. That arithmetic — 2^n versus n — is the argument.

> Memory cue: decorator keeps the interface and adds behaviour. Same interface in, same interface out, so they stack.""",
                    ),
                    (
                        "Mental Model",
                        """A decorator needs three things:

1. It implements the same interface as its subject.
2. It holds a reference to another instance of that interface.
3. It delegates, adding work before, after, or both.

Because the output type matches the input type, decorators compose recursively — which is what makes order a design decision rather than an accident.

| Concern | Where it usually belongs in the stack | Why |
| --- | --- | --- |
| Authorisation | Outermost | Must run on every call, before any cache |
| Rate limiting | Near the outside | Reject before doing work |
| Caching | Middle | Skip the expensive inner call |
| Retry | Inside the cache | Retry the real call, not the cache hit |
| Metrics and logging | Innermost | Measure what actually happened |""",
                    ),
                    (
                        "How It Works",
                        """### The basic shape

```java
public interface ImageStore {
    byte[] load(ImageId id);
}

public final class LoggingImageStore implements ImageStore {
    private final ImageStore delegate;

    public LoggingImageStore(ImageStore delegate) { this.delegate = delegate; }

    public byte[] load(ImageId id) {
        long start = System.nanoTime();
        try {
            return delegate.load(id);
        } finally {
            log.info("load {} took {}ms", id, (System.nanoTime() - start) / 1_000_000);
        }
    }
}
```

Note the `finally`: the decorator must not swallow the exception, and it must still do its work when one is thrown. A decorator that only logs on the happy path is worse than no logging.

### Composing at the composition root

```java
ImageStore store =
    new RateLimitedImageStore(
        new CachingImageStore(
            new RetryingImageStore(
                new S3ImageStore(s3), 3)),
        limiter);
```

Every consumer takes an `ImageStore` and knows nothing about the stack. Turning off caching in a test is one line.

### Java I/O is the canonical example

```java
InputStream in = new GZIPInputStream(
                     new BufferedInputStream(
                         new FileInputStream(path)));
```

`FileInputStream` reads bytes. `BufferedInputStream` adds buffering. `GZIPInputStream` adds decompression. Every one is an `InputStream`, so they stack in any sensible order, and a caller takes an `InputStream` without caring. If an interviewer asks for a real-world decorator, this is the answer — it is in the standard library and everyone recognises it.

### Decorator versus inheritance versus proxy

- **Inheritance:** combinations multiply, and the choice is fixed at compile time.
- **Decorator:** combinations are linear, and the choice is made at wiring time or runtime.
- **Proxy:** identical structure, but the intent is controlling access rather than augmenting behaviour.

### The practical downsides to name

Two, and mentioning them unprompted is worth doing.

**Debugging.** A stack trace through five decorators is five extra frames, and finding which layer changed the result takes longer.

**Interface width.** Decorating a fifteen-method interface means fifteen forwarding methods per decorator. If that hurts, the interface is too wide — the pain is interface segregation asking to be applied.""",
                    ),
                    (
                        "Example",
                        """A notification pipeline where each concern is independent and testable.

```java
public interface Notifier { void send(Recipient to, Message message); }

public final class RetryingNotifier implements Notifier {
    private final Notifier delegate;
    private final int attempts;
    private final Sleeper sleeper;          // injected so tests do not actually wait

    public void send(Recipient to, Message message) {
        RuntimeException last = null;
        for (int attempt = 1; attempt <= attempts; attempt++) {
            try {
                delegate.send(to, message);
                return;
            } catch (TransientNotificationFailure e) {
                last = e;
                sleeper.sleep(backoffFor(attempt));
            }
        }
        throw last;
    }
}

public final class DeduplicatingNotifier implements Notifier {
    private final Notifier delegate;
    private final Set<MessageId> seen;

    public void send(Recipient to, Message message) {
        if (!seen.add(message.id())) return;      // already delivered
        delegate.send(to, message);
    }
}
```

Wiring:

```java
Notifier notifier =
    new DeduplicatingNotifier(
        new RetryingNotifier(
            new MeteredNotifier(new TwilioSmsNotifier(twilio), metrics), 3, sleeper),
        seenIds);
```

Deduplication sits outside retry deliberately: a retry must be allowed to resend the same message, while a genuinely duplicate request must not. Getting that order wrong makes retries silently no-ops — a bug worth naming out loud, because it shows the order was a decision.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Cross-cutting concerns around any interface: retry, cache, metrics, logging, auth
- Java I/O streams, and any layered codec or transport
- Middleware chains in web frameworks, which are decorators over a handler
- Feature toggles: wrap with a decorator that short-circuits when the flag is off""",
                    ),
                    (
                        "Trade-offs",
                        """- **Deep stacks are hard to debug.** More frames, and behaviour depends on order rather than on any single class.
- **Order becomes load-bearing.** Wrong order gives subtle bugs — cache outside auth leaks data, dedupe inside retry kills retries.
- **Forwarding boilerplate scales with interface width.** Java has no delegation keyword.
- **Not everything belongs in a decorator.** Behaviour that needs the subject's internal state cannot be added from outside.
- **Identity is lost.** `equals` and `instanceof` against the concrete subject fail once it is wrapped, which surprises code that unwraps.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Swallowing exceptions in a decorator, or skipping the post-step when one is thrown
- Getting the order wrong: caching outside authorisation, deduplication inside retry
- Putting business logic in a decorator, so behaviour depends on wiring nobody reads
- Building decorators over a fifteen-method interface instead of splitting the interface
- Confusing decorator with proxy in the definition — the difference is augment versus control access
- Forgetting that a decorated object is not `instanceof` the concrete subject any more""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"Give a real-world decorator."** Java I/O: `new GZIPInputStream(new BufferedInputStream(new FileInputStream(f)))`. Each layer is an `InputStream` adding one behaviour.

**"Why not just subclass?"** Because combinations multiply. Three optional behaviours is eight subclasses with duplicated code, and the combination is fixed at compile time. Decorators are three classes composed at runtime.

**"Does order matter?"** Yes, and it is a design decision. Authorisation outside caching so nothing is served without a check; retry inside caching so you retry the real call; deduplication outside retry so retries still work.

**"What is the downside?"** Debuggability. Deep stacks obscure which layer produced a result, and the behaviour lives in the wiring rather than in any one class.""",
                    ),
                    (
                        "Interview Tip",
                        """Propose the decorator by naming the combination problem first — the arithmetic is what convinces.

> "We need retry, caching and metrics on this store. Subclassing gives me eight classes for three behaviours and no way to disable caching in a test. I will make each one a decorator over `ImageStore`, wire them in main, and put authorisation outermost so a cache hit can never bypass a permission check."

You have named the pattern, the arithmetic, the wiring point and a security consideration in four sentences.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """An HTTP client needs: request logging, a 30-second timeout, three retries with backoff, a circuit breaker, and per-host rate limiting.

1. Write the wrapping order and justify each position.
2. Which two would break each other if swapped, and how would the bug present?
3. Which of the five is a poor fit for a decorator, and why?""",
                    ),
                ],
                [
                    "Decorator keeps the interface and adds behaviour, so wrappers stack arbitrarily.",
                    "Subclassing combinations is 2^n classes; decorating them is n.",
                    "Wrapping order is a design decision: auth outside cache, retry inside cache.",
                    "A decorator must not swallow exceptions and must still run its post-step in a finally.",
                    "Java I/O streams are the canonical real-world example.",
                ],
                [
                    "Give a real-world example of the decorator pattern.",
                    "Why is decorating better than subclassing for optional behaviours?",
                    "Does the order of decorators matter? Give a case where it does.",
                    "What are the practical downsides of a deep decorator stack?",
                ],
            ),
            OD(
                "composite-pattern",
                "Composite & Flyweight",
                "Treating a tree uniformly with its leaves, and sharing state when object count becomes the problem.",
                11,
                "Composite lets a client treat a group of objects and a single object identically, which is how file systems, UI trees and nested organisation structures are modelled. Flyweight solves a different problem — too many objects — by sharing the parts that are identical. They appear together here because both are about scale: composite about structural depth, flyweight about count.",
                [
                    (
                        "Why It Matters",
                        """**Composite** removes the branch that every tree-walking algorithm otherwise needs. Without it, every operation over a directory tree starts with `if (node.isFile())`. With it, `Directory` and `File` share an interface and the recursion disappears into polymorphism.

**Flyweight** matters when an LLD problem turns out to have millions of small objects. A text editor with one `Character` object per glyph, each holding a font, size and colour, will exhaust memory on a large document. Splitting the state into shared intrinsic data and per-instance extrinsic data is the fix, and it is a good answer to the "now scale it" follow-up in a design interview.

> Memory cue: composite makes a tree look like a leaf. Flyweight makes a million objects cost like a hundred.""",
                    ),
                    (
                        "Mental Model",
                        """**Composite** has three roles: a `Component` interface, `Leaf` implementations with no children, and `Composite` implementations that hold children and usually delegate to them.

The recurring design question is where child-management methods go:

| Approach | `add`/`remove` on | Trade-off |
| --- | --- | --- |
| **Transparent** | The `Component` interface | Uniform, but `Leaf.add` must throw — a Liskov violation |
| **Safe** | Only on `Composite` | Type-safe, but callers must check the type to add |

There is no clean answer; the Gang of Four say so explicitly. Naming the dilemma is the correct interview response.

**Flyweight** splits state in two:

- **Intrinsic:** shared, immutable, context-free — a glyph's font and size.
- **Extrinsic:** per-use, passed in at call time — the glyph's position on the page.""",
                    ),
                    (
                        "How It Works",
                        """### Composite over a file system

```java
public sealed interface FsNode permits FsFile, FsDirectory {
    String name();
    long sizeBytes();
}

public record FsFile(String name, long sizeBytes) implements FsNode {}

public final class FsDirectory implements FsNode {
    private final String name;
    private final List<FsNode> children = new ArrayList<>();

    public String name() { return name; }

    public long sizeBytes() {
        return children.stream().mapToLong(FsNode::sizeBytes).sum();   // recursion, no branch
    }

    public void add(FsNode child) { children.add(child); }             // safe variant
    public List<FsNode> children() { return List.copyOf(children); }
}
```

`sizeBytes()` on a directory is the sum of its children, and a file's is its own. The caller writes `node.sizeBytes()` with no idea which it holds. Adding an operation — total count, deepest path, search — follows the same shape.

This is the safe variant: `add` exists only on `FsDirectory`, so nothing can add a child to a file. Say why you chose it.

### The recursion hazards

Two things to raise before an interviewer does.

**Cycles.** If a composite can contain an ancestor, every traversal is an infinite loop. Either prevent it on `add` by walking up the parent chain, or track visited nodes during traversal.

**Depth.** Deep trees blow the stack with naive recursion. An explicit `Deque` converts it to iteration, which also lets you bound the depth.

### Flyweight over a text editor

```java
// Intrinsic: shared, immutable, one instance per distinct combination.
public record Glyph(char symbol, String fontFamily, int sizePt, Colour colour) {}

public final class GlyphPool {
    private final Map<Glyph, Glyph> pool = new ConcurrentHashMap<>();

    public Glyph intern(char symbol, String fontFamily, int sizePt, Colour colour) {
        Glyph key = new Glyph(symbol, fontFamily, sizePt, colour);
        return pool.computeIfAbsent(key, g -> g);
    }
}

// Extrinsic: per-position, tiny, passed at render time.
public record PlacedGlyph(Glyph glyph, int x, int y) {}
```

A million-character document with twenty distinct glyph styles holds twenty `Glyph` objects and a million small `PlacedGlyph` records, rather than a million objects each carrying a font string.

`Integer.valueOf` does exactly this for values from -128 to 127, and `String` literal interning is the same idea. Citing those makes the pattern concrete rather than theoretical.

### The flyweight rule

Flyweight only works if the shared state is **immutable**. If a shared `Glyph` could change colour, every character using it would change. This is where the pattern most often goes wrong in practice.""",
                    ),
                    (
                        "Example",
                        """An organisation chart, where composite makes two different queries trivial.

```java
public sealed interface OrgNode permits Employee, Team {
    Money monthlyCost();
    int headcount();
}

public record Employee(EmployeeId id, String name, Money salary) implements OrgNode {
    public Money monthlyCost() { return salary.dividedBy(12); }
    public int headcount() { return 1; }
}

public final class Team implements OrgNode {
    private final String name;
    private final Employee lead;
    private final List<OrgNode> members = new ArrayList<>();

    public Money monthlyCost() {
        return members.stream()
            .map(OrgNode::monthlyCost)
            .reduce(lead.monthlyCost(), Money::plus);
    }

    public int headcount() {
        return 1 + members.stream().mapToInt(OrgNode::headcount).sum();
    }
}
```

Cost of the whole company and cost of one contractor are the same call. Adding "how many people report through this node?" is one more method on two classes rather than a recursive function with a type check.

The follow-up an interviewer will ask: what if a team can be a member of two parent teams? Then it is a directed acyclic graph, not a tree, and `headcount()` double-counts. The fix is to traverse with a visited set — and noticing that before being told is the point.""",
                    ),
                    (
                        "Common Use Cases",
                        """- File systems, UI component trees, menu hierarchies, organisation charts
- Expression trees and abstract syntax trees, where a node is an operation or a literal
- Nested pricing rules or permission groups that contain other groups
- Flyweight: text rendering, game tiles and sprites, any large grid of mostly identical cells""",
                    ),
                    (
                        "Trade-offs",
                        """- **Composite can make an interface too general.** Pushing `add` onto every component forces leaves to throw, which breaks substitutability. The safe variant fixes that and costs uniformity.
- **Recursive traversal has depth and cycle risks.** Both need explicit handling once trees are user-generated.
- **Composite hides cost.** `sizeBytes()` on a root looks like a getter and may walk a million nodes. This is the same trap as a lazy proxy.
- **Flyweight adds a pool and indirection.** Only worth it when the object count is genuinely the constraint; measure before reaching for it.
- **Flyweight requires immutability.** Sharing mutable state is a bug factory, not an optimisation.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Putting `add` and `remove` on the leaf interface and throwing from the leaf
- Traversing without cycle detection when the structure can contain a loop
- Deep recursion on a user-controlled tree, producing a stack overflow
- Applying flyweight before measuring, adding a pool that saves nothing
- Making flyweight objects mutable, so one change ripples to every user
- Forgetting that a shared pool needs thread-safe access""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"Where do add and remove belong?"** Either on the component for uniformity, which forces leaves to throw, or only on the composite for type safety, which forces callers to check. I prefer the safe variant and I would say why out loud, because the trade-off is real either way.

**"How do you handle cycles?"** Reject them on insertion by walking the parent chain, or carry a visited set through the traversal. Without one of the two, any traversal can hang.

**"When would you use flyweight?"** When object count is the memory constraint and most of each object's state is duplicated. Text glyphs and map tiles are the classic cases, and `Integer.valueOf` caching is the standard-library example.

**"What must be true for flyweight to be safe?"** The shared intrinsic state must be immutable, and the pool must be thread-safe.""",
                    ),
                    (
                        "Interview Tip",
                        """When a prompt contains a hierarchy, name composite immediately and then raise the two hazards before you are asked.

> "Directories and files share a `FsNode` interface so size and search are the same call at any depth. I will keep `add` on `Directory` only rather than on the interface, so a file cannot pretend to accept children. And because this tree is user-created I want cycle detection on insert and an iterative traversal, otherwise a symlink loop hangs the process."

Two hazards volunteered is usually the difference between a competent answer and a memorable one.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Design the node model for a UI layout system: panels contain panels and widgets, and you need `render()`, `preferredSize()` and `findById(String)`.

1. Which methods go on the component interface, and which only on the container?
2. `findById` must stop at the first match. How does that change the recursion?
3. Now the design system has 50,000 buttons that share ten distinct styles. Which parts of a button are intrinsic and which extrinsic?""",
                    ),
                ],
                [
                    "Composite lets a client treat a tree and a leaf identically, removing type checks.",
                    "Child-management methods on the component force leaves to throw; the safe variant avoids it.",
                    "User-generated trees need cycle detection and bounded or iterative traversal.",
                    "Flyweight splits shared immutable intrinsic state from per-use extrinsic state.",
                    "Integer.valueOf caching and String interning are flyweight in the standard library.",
                ],
                [
                    "Should add and remove live on the component interface?",
                    "How do you prevent infinite recursion in a composite structure?",
                    "When is flyweight worth the extra pool?",
                    "Why must flyweight intrinsic state be immutable?",
                ],
            ),
        ],
    )


# ---------------------------------------------------------------------------
# Module 5 — Behavioural patterns
# ---------------------------------------------------------------------------


def _strategy_topic() -> dict:
    return _ood_topic(
        "strategy-pattern",
        "Strategy & Template Method",
        "Two ways to vary part of an algorithm: swap the whole thing at runtime, or fill in named steps of a fixed skeleton.",
        "MEDIUM",
        13,
        [
            OD(
                "strategy-pattern",
                "Strategy Pattern",
                "Pull the varying algorithm behind an interface so it can be chosen, tested and replaced independently.",
                12,
                "Strategy is the pattern you reach for when a class does one thing but the *how* varies. It is the cleanest way to delete a growing conditional, and it is the pattern most often present in a strong LLD answer — pricing policies, allocation policies, eviction policies and fee policies are all strategies.",
                [
                    (
                        "Why It Matters",
                        """A class that contains three ways of doing something has three reasons to change and three sets of tests that cannot run independently.

```java
class Sorter {
    void sort(int[] data, String algo) {
        if (algo.equals("quick")) { /* 40 lines */ }
        else if (algo.equals("merge")) { /* 45 lines */ }
        else if (algo.equals("radix")) { /* 30 lines */ }
    }
}
```

A bug in the radix branch requires touching the file that contains the other two. Adding a fourth means re-testing all of them. Extract each into a `SortStrategy` and the class shrinks to a delegation, each algorithm gets its own test, and adding one is additive.

In an LLD interview the payoff is bigger than code hygiene. When the interviewer says "now the parking lot charges differently at weekends", a design with a `FeePolicy` strategy absorbs it in one new class. A design with the fee arithmetic inside `ParkingLot` has to be surgery.

> Memory cue: strategy names the thing that varies and makes it a parameter.""",
                    ),
                    (
                        "Mental Model",
                        """Three parts: a **context** that owns the workflow, a **strategy interface** naming the varying step, and **implementations**.

The test for whether you need one: can you finish this sentence? *"Everything in this class is fixed except how it ______."* If yes, that blank is the strategy.

| | Strategy | Simple conditional |
| --- | --- | --- |
| Adding a variant | New class, no edits | Edit a tested method |
| Testing one variant | In isolation | Through the whole context |
| Choosing at runtime | Yes — swap the field | Only via the same branch |
| Reading all variants | Several files | One screen |
| Right when | The set grows, or variants are complex | The set is closed and each case is a line or two |""",
                    ),
                    (
                        "How It Works",
                        """### The shape

```java
public interface FeePolicy {
    Money feeFor(VehicleType type, Duration stay);
}

public final class HourlyFeePolicy implements FeePolicy {
    private final Map<VehicleType, Money> perHour;

    public Money feeFor(VehicleType type, Duration stay) {
        long hours = Math.max(1, (long) Math.ceil(stay.toMinutes() / 60.0));
        return perHour.get(type).times(hours);
    }
}

public final class ParkingLot {
    private final FeePolicy feePolicy;      // injected, swappable

    public Receipt checkout(Ticket ticket, Instant now) {
        Duration stay = Duration.between(ticket.issuedAt(), now);
        Money fee = feePolicy.feeFor(ticket.vehicleType(), stay);
        spots.release(ticket.spotId());
        return new Receipt(ticket, stay, fee);
    }
}
```

`ParkingLot` owns the workflow — compute the stay, price it, release the spot — and knows nothing about pricing arithmetic. Weekend pricing, a flat daily cap, an early-bird discount: all new classes.

### Strategies compose

Because a strategy has the same interface in and out, strategies can wrap each other exactly like decorators.

```java
public final class CappedFeePolicy implements FeePolicy {
    private final FeePolicy delegate;
    private final Money dailyCap;

    public Money feeFor(VehicleType type, Duration stay) {
        Money raw = delegate.feeFor(type, stay);
        Money cap = dailyCap.times(Math.max(1, stay.toDays()));
        return raw.isGreaterThan(cap) ? cap : raw;
    }
}
```

`new CappedFeePolicy(new HourlyFeePolicy(rates), Money.ofDollars(25))`. This composability is worth demonstrating in an interview: it turns "add a daily maximum" from a change into an addition.

### In Java, a strategy is often a lambda

```java
public interface FeePolicy { Money feeFor(VehicleType type, Duration stay); }

FeePolicy flatFive = (type, stay) -> Money.ofDollars(5);
```

Single-method strategies need no class at all. `Comparator` is the standard library's most-used strategy, and `Collections.sort(list, comparator)` is the pattern in its purest form. Citing `Comparator` is a strong concrete answer.

### Choosing the strategy

Three ways, in increasing order of dynamism:

- **Constructor injection.** Fixed for the lifetime of the context. Most common.
- **Method parameter.** Different per call — `sort(data, comparator)`.
- **Registry lookup.** Chosen from runtime data via a factory, which is when strategy and factory appear together.""",
                    ),
                    (
                        "Example",
                        """A shipping quote, with the interviewer's follow-up already absorbed.

```java
public interface ShippingRate {
    Money quote(Parcel parcel, Address destination);
}

public final class WeightBasedRate implements ShippingRate {
    public Money quote(Parcel parcel, Address destination) {
        return baseRate.plus(perKilo.times(parcel.weightKg()));
    }
}

public final class FreeOverThreshold implements ShippingRate {
    private final ShippingRate delegate;
    private final Money threshold;

    public Money quote(Parcel parcel, Address destination) {
        return parcel.orderValue().isGreaterThan(threshold)
            ? Money.ZERO
            : delegate.quote(parcel, destination);
    }
}
```

Wiring:

```java
ShippingRate rate = new FreeOverThreshold(
                        new WeightBasedRate(base, perKilo),
                        Money.ofDollars(50));
```

Now "free shipping over fifty dollars, except for oversized parcels" is another wrapper rather than another branch. And each rule is testable on its own with no `Order`, no `Cart` and no database.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Pricing, discounts, taxes and fees — the most common strategy in LLD problems
- Cache eviction: LRU, LFU, FIFO behind one `EvictionPolicy`
- Spot or resource allocation: nearest, cheapest, first available
- Sorting and comparison, where `Comparator` is a strategy by another name
- Retry and backoff policies, compression codecs, authentication schemes""",
                    ),
                    (
                        "Trade-offs",
                        """- **Class count rises.** Four pricing rules is four files. Lambdas help when the strategy is one expression.
- **The variants are no longer visible together.** A reader must find the implementations. Keeping them in one package, or using a sealed interface, mitigates this.
- **The context must expose enough to the strategy.** A pricing strategy needing five values from the order either takes a wide parameter list or a context object, and getting that interface right is the real design work.
- **Overkill for a closed pair.** Two cases that will never grow are clearer as an `if`. Say that rather than reflexively extracting.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Extracting a strategy for two cases that are one line each
- Passing the entire context object to the strategy, which recouples them
- Giving each strategy a different method signature, so they are not actually interchangeable
- Keeping mutable state in a shared strategy instance, creating a race
- Confusing strategy with state: strategy is chosen from outside, state transitions itself
- Leaving a `switch` in the context that picks the strategy, when a registry would do""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"Strategy versus state?"** Structurally identical. In strategy the client chooses the implementation and it usually does not change; in state the object transitions between implementations itself in response to events.

**"When is a conditional better?"** When the variant set is closed and small and each case is a line or two. Three classes to replace a three-line `if` is a net loss.

**"How does the strategy get what it needs?"** Through its method parameters. If it needs many values, pass a small purpose-built context object rather than the whole aggregate, otherwise you have recoupled them.

**"Give a standard-library example."** `Comparator` passed to `Collections.sort`, and `ThreadPoolExecutor`'s `RejectedExecutionHandler`.""",
                    ),
                    (
                        "Interview Tip",
                        """Introduce the strategy by naming what varies and what stays fixed. That sentence is the design justification.

> "The parking lot's workflow is fixed — find the stay duration, price it, release the spot. What varies is the pricing, and the product roadmap is more pricing rules. So `FeePolicy` becomes an interface injected into the lot, and weekend pricing or a daily cap is a new class. If pricing were one flat rate forever, I would leave it inline."

You have named the pattern, the axis of change, and the condition under which you would not use it.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """A ride-hailing app computes fares. Base rate varies by city, surge varies by demand, there are promo codes, and airport rides add a fixed surcharge.

1. Is this one strategy or several? Justify.
2. Design the interface, including exactly what the strategy receives.
3. Promo codes must apply after surge but before the airport surcharge. How does your design enforce that order, and where does the order live?""",
                    ),
                ],
                [
                    "Name the thing that varies and make it a parameter behind an interface.",
                    "Strategies share an interface, so they compose and wrap like decorators.",
                    "In Java a single-method strategy is a lambda; Comparator is the canonical example.",
                    "Pass the strategy a purpose-built context, not the whole aggregate.",
                    "Strategy is chosen from outside; state transitions itself. That is the only difference.",
                ],
                [
                    "How does strategy differ from the state pattern?",
                    "When is a plain conditional the better choice?",
                    "How does a strategy get the data it needs without recoupling?",
                    "Name a strategy from the Java standard library.",
                ],
            ),
            OD(
                "template-method-pattern",
                "Template Method",
                "A fixed algorithm skeleton in the parent with named steps subclasses fill in.",
                10,
                "Template method is inheritance used correctly: the parent owns the algorithm and its call order, and subclasses supply only the steps that vary. It is the one place where a base class is clearly better than composition, and knowing why makes your \"favour composition\" position credible rather than dogmatic.",
                [
                    (
                        "Why It Matters",
                        """Some algorithms have a genuinely fixed shape with a couple of variable steps. Importing a data file is always: open, validate, parse each row, persist, close, report. Only the parsing and validation differ by format.

With strategy you would need three injected collaborators and a class to sequence them. With template method the sequence lives in one abstract class and each format supplies two methods. When the order must not vary, having the parent own it is a feature, not a limitation.

This is also where the Hollywood principle applies — "don't call us, we'll call you". The subclass never drives; it is called at the right moment by the parent. Most framework extension points work this way: `HttpServlet.doGet`, JUnit's `@BeforeEach`, `AbstractList`.

> Memory cue: template method fixes the order and varies the steps. Strategy varies the whole algorithm.""",
                    ),
                    (
                        "Mental Model",
                        """The parent has one `final` public method — the template — that calls a sequence of protected steps. Steps come in three flavours:

| Step kind | Declared as | Subclass |
| --- | --- | --- |
| **Required** | `protected abstract` | Must implement |
| **Optional hook** | `protected` with an empty or default body | May override |
| **Fixed** | `private` or `final` | Cannot change |

Making the template method `final` is the point of the pattern: it guarantees the order. A subclass that could override the template could reorder the steps, and the guarantee evaporates.

| | Template method | Strategy |
| --- | --- | --- |
| Mechanism | Inheritance | Composition |
| Bound at | Compile time | Runtime |
| Varies | Named steps | The whole algorithm |
| Order owned by | The parent, guaranteed | The context |
| Multiple variations | One hierarchy only | One field per axis |""",
                    ),
                    (
                        "How It Works",
                        """### The shape

```java
public abstract class DataImporter {

    public final ImportReport importFrom(Path file) {     // final: the order is the contract
        ImportReport report = new ImportReport(file);
        try (var source = open(file)) {
            beforeImport(report);                          // hook, default does nothing
            for (RawRow raw : readRows(source)) {          // abstract: format-specific
                var validation = validate(raw);            // abstract: format-specific
                if (validation.failed()) {
                    report.reject(raw, validation.reason());
                    continue;
                }
                persist(toRecord(raw));                    // shared
                report.accept(raw);
            }
            afterImport(report);                           // hook
        }
        return report;
    }

    protected abstract Iterable<RawRow> readRows(Source source);
    protected abstract Validation validate(RawRow row);

    protected void beforeImport(ImportReport report) { }   // optional
    protected void afterImport(ImportReport report) { }    // optional

    private void persist(Record record) { /* shared, cannot be overridden */ }
}
```

`CsvImporter` supplies two methods. `XmlImporter` supplies two methods and overrides `afterImport` to log a schema version. Neither can accidentally skip persistence or reorder validation and persistence.

### Hooks give optionality without abstract methods

A hook with an empty body means a subclass opts in. Without hooks, every optional step becomes an abstract method that most subclasses implement as `{}` — which is the empty-method smell from interface segregation.

### Why not just use strategy here?

Because the order is the guarantee. If validation running before persistence is a correctness requirement, encoding it in a `final` parent method is stronger than hoping a context class sequences three injected collaborators correctly. When the interviewer asks why you used inheritance after arguing for composition, that is the answer.

### The limits, stated honestly

- **One axis only.** If importers vary by both format *and* destination, you are back to a class per combination. That is the point where you switch to strategy.
- **Fragile base class.** Adding a step to the template changes behaviour for every subclass silently. Keep the template short and the steps well named.
- **Protected members are API.** Anything `protected` is a contract with subclasses you cannot change freely. Prefer the smallest possible protected surface.
- **Harder to test in isolation.** A step cannot be tested without instantiating a subclass, whereas a strategy is a standalone object. This is the strongest practical argument for strategy.""",
                    ),
                    (
                        "Example",
                        """Java's own libraries use this constantly, which makes it easy to cite.

```java
// AbstractList: the template is get/size-driven iteration; you supply two methods.
public class RangeList extends AbstractList<Integer> {
    private final int from, to;

    public Integer get(int index) { return from + index; }
    public int size() { return to - from; }
    // iterator(), contains(), indexOf(), subList(), equals(), hashCode() all come free
}
```

```java
// HttpServlet: service() is the template; it dispatches to hooks you override.
public class HealthServlet extends HttpServlet {
    protected void doGet(HttpServletRequest req, HttpServletResponse res) throws IOException {
        res.setStatus(200);
        res.getWriter().write("ok");
    }
}
```

In both cases the parent owns the algorithm — iteration, HTTP method dispatch — and you fill in the parts only you can know. Naming `AbstractList` or `HttpServlet` in an interview turns an abstract pattern into something the interviewer has used this week.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Import, export and ETL pipelines with a fixed shape and format-specific parsing
- Framework base classes: servlets, test lifecycles, batch jobs, message consumers
- Any workflow where the *order* is a correctness requirement rather than a convenience
- Algorithms with a shared setup and teardown around a variable middle""",
                    ),
                    (
                        "Trade-offs",
                        """- **Uses the single inheritance slot.** A subclass cannot extend anything else, and composition does not have this problem.
- **Compile-time only.** You cannot swap the variable step at runtime the way you can with a strategy field.
- **One axis of variation.** Two axes means the class explosion returns.
- **Testing a step needs a subclass.** Strategies are independently testable; template steps are not.
- **Protected surface is a contract.** Every protected method is something subclasses depend on and you cannot refactor freely.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Leaving the template method non-final, so a subclass can reorder or skip steps
- Making every step abstract, forcing empty implementations in most subclasses
- Calling an overridable method from the constructor, which runs before the subclass is initialised
- Growing the template to fifteen steps, so no subclass can be understood without reading the parent
- Using template method when the variation is on two independent axes
- Exposing internal state as `protected` so subclasses depend on the parent's fields""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"Template method or strategy?"** Template method when the order is fixed and is itself the guarantee, and the variation is on one axis. Strategy when the whole algorithm varies, when you need runtime swapping, or when there are two axes.

**"Why make the template method final?"** Because the sequence is the contract. If a subclass can override it, the parent no longer guarantees that validation runs before persistence.

**"Why are hooks better than abstract methods?"** A hook with a default body means only the subclasses that care override it. Making everything abstract forces empty implementations everywhere, which is the empty-method smell.

**"What is the danger of calling an overridable method from a constructor?"** The subclass override runs before the subclass's fields are initialised, so it sees nulls and zeros. This is a real and frequently-hit Java bug.""",
                    ),
                    (
                        "Interview Tip",
                        """Use template method as the example that proves your composition preference is a judgement, not a rule.

> "I generally favour composition, but here I would use template method. The import sequence — validate, then persist, then report — is a correctness requirement, and making the template `final` in the parent guarantees no format can reorder it. Only the parsing varies, and it varies on one axis. If importers also had to vary by destination, I would switch to strategy before the class count doubled."

That answer shows you know both patterns and the boundary between them.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Design a `ReportGenerator` base class. Every report: fetches data, transforms it, renders it, and delivers it. PDF and CSV differ only in rendering; the weekly sales report also needs a currency-conversion step that no other report has.

1. Which steps are abstract, which are hooks, and which are fixed?
2. Why should `generate()` be final?
3. Now reports must also vary by delivery channel — email, S3, SFTP. Does template method still fit? If not, what changes?""",
                    ),
                ],
                [
                    "The template method is final; the order it fixes is the whole point of the pattern.",
                    "Abstract steps are required, hooks with default bodies are optional, private steps are fixed.",
                    "Template method varies steps on one axis; strategy varies the whole algorithm on many.",
                    "AbstractList and HttpServlet are template method in the standard library.",
                    "Never call an overridable method from a constructor — the override sees uninitialised fields.",
                ],
                [
                    "When would you choose template method over strategy?",
                    "Why should the template method be declared final?",
                    "What is the advantage of a hook over an abstract method?",
                    "Why is calling an overridable method from a constructor dangerous?",
                ],
            ),
        ],
    )


def _observer_topic() -> dict:
    return _ood_topic(
        "observer-pattern",
        "Observer & Events",
        "One-to-many notification without the publisher knowing its listeners, and the failure modes that appear the moment it is synchronous.",
        "MEDIUM",
        14,
        [
            OD(
                "observer-pattern",
                "Observer Pattern",
                "Decoupling 'something happened' from 'here is everyone who cares'.",
                12,
                "Observer lets an object announce a change without knowing who is listening. It is the pattern behind UI event handlers, domain events and every publish-subscribe system, and in an LLD interview it is the natural answer to \"when an order is placed, we also need to update inventory, send an email and log an analytics event\" — a requirement that otherwise turns one method into a dumping ground.",
                [
                    (
                        "Why It Matters",
                        """Without observer, every new reaction edits the class where the event happens.

```java
class Order {
    void place() {
        status = PLACED;
        inventory.reserve(lines);          // added in sprint 1
        email.sendConfirmation(customer);  // added in sprint 2
        analytics.track("order_placed");   // added in sprint 3
        loyalty.awardPoints(customer);     // added in sprint 4
    }
}
```

`Order` now depends on inventory, email, analytics and loyalty. It cannot be tested without four fakes, and a marketing change forces a change to the order aggregate.

With observer, `Order` publishes `OrderPlaced` and knows nothing else. Each reaction is a separate subscriber, separately testable, added and removed without touching the order.

The cost is real and interviewers probe it: the flow becomes implicit. Reading `Order.place()` no longer tells you what happens. That trade — decoupling against traceability — is the discussion to be ready for.

> Memory cue: observer inverts the dependency of notification. The publisher depends on nobody; subscribers depend on the event type.""",
                    ),
                    (
                        "Mental Model",
                        """Two roles. A **subject** keeps a list of subscribers and notifies them; an **observer** reacts.

The variations that matter in an interview:

| Question | Options | Consequence |
| --- | --- | --- |
| Push or pull? | Send the data with the event, or send a reference and let observers query | Push is simpler; pull avoids sending data nobody needs |
| Sync or async? | Call listeners inline, or hand to a queue | Sync is simple and couples latency and failure; async needs delivery guarantees |
| Ordered? | Guaranteed order, or unspecified | Order dependence between observers is a design smell |
| Failure? | One failing observer aborts, or is isolated | Nearly always: isolate |

Say which you are choosing. "Synchronous, isolated failures, no ordering guarantee" is a precise design statement.""",
                    ),
                    (
                        "How It Works",
                        """### A minimal, honest implementation

```java
public interface DomainEvent {}

public record OrderPlaced(OrderId orderId, CustomerId customerId, Money total)
    implements DomainEvent {}

public interface EventListener<E extends DomainEvent> {
    void on(E event);
}

public final class EventBus {
    private final Map<Class<?>, List<EventListener<?>>> listeners = new ConcurrentHashMap<>();

    public <E extends DomainEvent> void subscribe(Class<E> type, EventListener<E> listener) {
        listeners.computeIfAbsent(type, t -> new CopyOnWriteArrayList<>()).add(listener);
    }

    @SuppressWarnings("unchecked")
    public <E extends DomainEvent> void publish(E event) {
        for (EventListener<?> raw : listeners.getOrDefault(event.getClass(), List.of())) {
            try {
                ((EventListener<E>) raw).on(event);
            } catch (RuntimeException e) {
                log.error("listener {} failed for {}", raw.getClass(), event, e);   // isolated
            }
        }
    }
}
```

Three deliberate choices worth narrating. `CopyOnWriteArrayList` means a listener can subscribe or unsubscribe during iteration without a `ConcurrentModificationException` — the classic bug in naive implementations. The `try/catch` isolates failures so one broken listener cannot stop the others. And the event is an immutable record, so a listener cannot mutate what the next listener sees.

### The four failure modes to name

**Concurrent modification.** An observer that unsubscribes itself while being notified corrupts a plain `ArrayList` iteration. Copy the list before iterating, or use a copy-on-write structure.

**Lapsed listener leak.** A subject holding strong references to observers that are never unsubscribed keeps them alive forever. This is the most common memory leak in UI and long-lived services. Either enforce unsubscription with a returned handle, or hold weak references.

**Reentrancy.** An observer that triggers another event, which notifies the first observer again, produces infinite recursion or a surprising interleaving. Guard with a re-entrancy flag or queue events rather than dispatching inline.

**Latency and failure coupling.** Synchronous observers run on the caller's thread. Five listeners each taking 200 ms add a second to the request, and one that throws can abort the transaction. This is why the sync/async decision matters.

### Sync versus async, decided properly

Keep it synchronous when the listener's work is genuinely part of the transaction — reserving inventory must not silently fail after the order is committed.

Go asynchronous when the work is ancillary — emails, analytics, cache warming. Then the publisher writes to a queue or an outbox table, and a separate worker delivers. That buys latency isolation and costs you at-least-once delivery, which means listeners must be idempotent.

Naming the outbox pattern here is a strong signal: publishing to a queue inside a database transaction is not atomic, so you write the event to a table in the same transaction and relay it afterwards.""",
                    ),
                    (
                        "Example",
                        """The order flow, refactored, with the transactional boundary made explicit.

```java
public final class PlaceOrder {
    private final Orders orders;
    private final SeatInventory inventory;
    private final EventBus events;

    public OrderId handle(NewOrder command) {
        // In-transaction and mandatory: if this fails, the order does not exist.
        inventory.reserve(command.lines());
        Order order = orders.create(command);

        // Ancillary: published after commit, delivered asynchronously.
        events.publish(new OrderPlaced(order.id(), order.customerId(), order.total()));
        return order.id();
    }
}

public final class SendConfirmationEmail implements EventListener<OrderPlaced> {
    public void on(OrderPlaced event) { mailer.sendConfirmation(event.customerId(), event.orderId()); }
}

public final class AwardLoyaltyPoints implements EventListener<OrderPlaced> {
    public void on(OrderPlaced event) { loyalty.award(event.customerId(), event.total()); }
}
```

The important line is the comment. Inventory reservation stayed inline because the order is wrong without it; email and loyalty became listeners because a failed email must not roll back a paid order. Drawing that line — what is in the transaction and what is a reaction — is the actual design work, and it is what an interviewer is listening for.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Domain events: order placed, payment captured, user registered
- UI event handling, which is observer with a different vocabulary
- Cache invalidation when an entity changes
- Audit and analytics, which should never be able to fail a business operation
- Any requirement phrased as "when X happens, also do Y and Z" """,
                    ),
                    (
                        "Trade-offs",
                        """- **Flow becomes implicit.** You cannot see what happens by reading the publisher. Mitigate with naming conventions and by keeping the listener set discoverable in the composition root.
- **Debugging is harder.** A stack trace from a listener does not obviously connect to the action that caused it. Correlation ids help.
- **Sync couples latency and failure; async loses ordering and exactly-once.** There is no option without a cost.
- **Ordering between observers is fragile.** If listener B depends on listener A having run, they are not independent and should be one listener or an explicit sequence.
- **Memory leaks from unremoved listeners** are the number one production failure of this pattern.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Iterating the listener list without copying, then mutating it during dispatch
- Letting one listener's exception abort the publisher and everything after it
- Never unsubscribing, so the subject retains observers forever
- Putting mandatory transactional work in an asynchronous listener
- Publishing a mutable event object that one listener can change for the next
- Building an ordering dependency between two listeners instead of merging them""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"What happens if an observer throws?"** In my implementation, it is caught and logged so other listeners still run. The publisher must not be at the mercy of a subscriber it does not know about.

**"Synchronous or asynchronous?"** Synchronous for work that belongs in the same transaction; asynchronous for ancillary work. Asynchronous delivery is at-least-once, so those listeners must be idempotent.

**"How do you avoid the lapsed listener leak?"** Return an unsubscribe handle from `subscribe` and require callers to close it, or hold weak references. The leak is the most common real failure of this pattern.

**"How do you guarantee an event is published if the transaction commits?"** The outbox pattern: write the event into a table in the same transaction, and relay it to the broker afterwards. Publishing directly to a queue inside a transaction is not atomic.

**"Observer versus a message queue?"** Same shape, different scope. Observer is in-process with no durability; a queue adds persistence, retries and cross-process delivery, at the cost of infrastructure and eventual consistency.""",
                    ),
                    (
                        "Interview Tip",
                        """Draw the transactional line out loud. That is the senior part of this answer.

> "I will publish an `OrderPlaced` event so email, analytics and loyalty become listeners rather than dependencies of the order. Inventory reservation stays inline because the order is invalid without it. The event goes out through an outbox after commit, listeners are idempotent because delivery is at-least-once, and one listener failing is logged rather than allowed to affect the others."

Four sentences covering coupling, transactions, delivery semantics and failure isolation.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """A user registers. The system must: create the account, send a verification email, add them to a CRM, start a 14-day trial, and record an analytics event.

1. Which of the five belong inside the registration transaction and which are listeners? Justify each.
2. The CRM is down for an hour. What happens in your design, and what does the user see?
3. The email listener runs twice because of at-least-once delivery. What stops the user getting two emails?""",
                    ),
                ],
                [
                    "The publisher depends on nobody; subscribers depend only on the event type.",
                    "Isolate listener failures — one broken subscriber must not stop the others.",
                    "Copy-on-write or a defensive copy prevents concurrent modification during dispatch.",
                    "Unremoved listeners are the classic memory leak this pattern produces.",
                    "Decide what is inside the transaction and what is a reaction; use an outbox for the rest.",
                ],
                [
                    "What happens when an observer throws an exception?",
                    "Synchronous or asynchronous notification — how do you decide?",
                    "How do you prevent the lapsed listener memory leak?",
                    "How do you guarantee an event is published only if the transaction commits?",
                ],
            ),
        ],
    )


def _state_topic() -> dict:
    return _ood_topic(
        "state-pattern",
        "State Pattern & State Machines",
        "Modelling an object whose behaviour changes with its state, and making illegal transitions impossible instead of merely unlikely.",
        "MEDIUM",
        15,
        [
            OD(
                "state-pattern",
                "State Pattern",
                "Replacing a tangle of status flags with objects that know what they allow.",
                13,
                "A vending machine, an order, an elevator, a document workflow, a TCP connection — all are objects whose legal operations depend on what has already happened. The state pattern gives each state its own class, so the question \"can I do this right now?\" is answered by the type rather than by a conditional someone has to remember to write.",
                [
                    (
                        "Why It Matters",
                        """Status-flag code degrades in a predictable way.

```java
class Order {
    boolean paid, shipped, cancelled, refunded;

    void ship() {
        if (paid && !shipped && !cancelled) { shipped = true; }
    }
    void cancel() {
        if (!shipped && !cancelled) { cancelled = true; }
        // what about refunding if paid? someone will forget
    }
}
```

Four booleans allow sixteen combinations, of which perhaps five are legal. Every method has to re-derive which. Nothing documents the legal transitions, so each new method is another chance to permit `shipped && cancelled`.

The state pattern replaces the flags with an object. `ShippedOrder` simply does not implement cancellation the way `PaidOrder` does, so the illegal combination cannot be represented.

Interviewers reach for this constantly because so many LLD prompts are state machines in disguise. Recognising one and saying "this is a state machine, let me draw the transitions" is often the highest-value sentence in the interview.

> Memory cue: if the answer to "what does this method do?" is "it depends what happened before", you have a state machine.""",
                    ),
                    (
                        "Mental Model",
                        """A **context** holds a reference to a **state** object and delegates to it. Each state implements the same interface and knows two things: what it permits, and what state comes next.

Two decisions to make explicitly:

| Decision | Options |
| --- | --- |
| Who decides the transition? | The state itself, or the context reading a returned value |
| What does an illegal operation do? | Throw, return a result, or no-op |

Letting each state name its successor keeps the transition table distributed but local. Having the context decide centralises it and re-introduces a conditional. Either is defensible; say which and why.

For small, closed machines, a Java `enum` with per-constant behaviour is often the better fit — fewer files and exhaustiveness for free. Mentioning that alternative is worth doing.""",
                    ),
                    (
                        "How It Works",
                        """### States as classes

```java
public interface VendingState {
    VendingState insertCoin(VendingMachine machine, Coin coin);
    VendingState select(VendingMachine machine, Slot slot);
    VendingState refund(VendingMachine machine);
}

public final class Idle implements VendingState {
    public VendingState insertCoin(VendingMachine m, Coin coin) {
        m.addCredit(coin.value());
        return new HasCredit();
    }
    public VendingState select(VendingMachine m, Slot slot) {
        throw new NoCreditInserted();
    }
    public VendingState refund(VendingMachine m) {
        return this;                       // nothing to refund
    }
}

public final class HasCredit implements VendingState {
    public VendingState insertCoin(VendingMachine m, Coin coin) {
        m.addCredit(coin.value());
        return this;
    }
    public VendingState select(VendingMachine m, Slot slot) {
        if (!m.inventory().isAvailable(slot))  throw new SoldOut(slot);
        if (m.credit().isLessThan(m.priceOf(slot))) return this;   // wait for more coins
        m.dispense(slot);
        m.returnChange();
        return new Idle();
    }
    public VendingState refund(VendingMachine m) {
        m.returnChange();
        return new Idle();
    }
}
```

The context is thin:

```java
public final class VendingMachine {
    private VendingState state = new Idle();

    public void insertCoin(Coin coin) { state = state.insertCoin(this, coin); }
    public void select(Slot slot)     { state = state.select(this, slot); }
    public void refund()              { state = state.refund(this); }
}
```

Every conditional about "am I allowed to do this?" has disappeared into the type. Adding a `Maintenance` state is a new class; it cannot break the others.

### The enum alternative

```java
public enum OrderStatus {
    PLACED   { public Set<OrderStatus> next() { return Set.of(PAID, CANCELLED); } },
    PAID     { public Set<OrderStatus> next() { return Set.of(SHIPPED, REFUNDED); } },
    SHIPPED  { public Set<OrderStatus> next() { return Set.of(DELIVERED, RETURNED); } },
    DELIVERED{ public Set<OrderStatus> next() { return Set.of(); } },
    CANCELLED{ public Set<OrderStatus> next() { return Set.of(); } },
    REFUNDED { public Set<OrderStatus> next() { return Set.of(); } },
    RETURNED { public Set<OrderStatus> next() { return Set.of(REFUNDED); } };

    public abstract Set<OrderStatus> next();

    public void checkTransitionTo(OrderStatus target) {
        if (!next().contains(target)) throw new IllegalTransition(this, target);
    }
}
```

The whole transition table is on one screen, it persists as a single column, and `switch` over it can be checked for exhaustiveness. For a status field that mostly gates transitions rather than carrying behaviour, this is usually the better choice — and saying so shows you are choosing rather than reciting.

### Persisting a state machine

Two questions interviewers ask that catch people out.

**How is state stored?** As a discriminator column — a status string or enum — rehydrated into the right state object on load. Never serialise the state object itself.

**How do you make a transition atomic?** Read the current state, check the transition is legal, and write conditionally: `UPDATE orders SET status='SHIPPED' WHERE id=? AND status='PAID'`. If the update affects zero rows, someone else moved it first. Without that condition two concurrent requests can both see `PAID` and both ship.""",
                    ),
                    (
                        "Example",
                        """The same order, before and after, with the illegal combination made unrepresentable.

```java
// Before: sixteen boolean combinations, five of them legal, nothing enforcing which.
if (paid && !shipped && !cancelled && !refunded) { ... }
```

```java
// After: a sealed set of states, each one stating what it permits.
public sealed interface OrderState permits Placed, Paid, Shipped, Delivered, Cancelled {}

public record Paid(Instant paidAt, TransactionId transaction) implements OrderState {}
public record Shipped(TrackingNumber tracking, Instant shippedAt) implements OrderState {}
```

The second version carries data with the state — a shipped order has a tracking number and a paid order has a transaction id, and neither can exist without it. That is something booleans cannot express at all: with flags, `shipped == true` and `trackingNumber == null` is representable, and someone will produce it.

Because the interface is sealed, a `switch` over `OrderState` is exhaustiveness-checked, so adding `Returned` produces a compile error at every place that must handle it. That is the strongest form of this pattern in modern Java, and it is worth showing.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Vending machines, ATMs, elevators, turnstiles — the classic LLD prompts
- Order, booking, payment and document approval lifecycles
- Connection and session handling: connecting, open, closing, closed
- Any media player, game entity or workflow with modes
- Feature rollouts and job schedulers: pending, running, retrying, failed, succeeded""",
                    ),
                    (
                        "Trade-offs",
                        """- **A class per state.** Six states is six files. For a machine that only gates transitions, an enum is less code and easier to read whole.
- **Transitions become distributed.** With states naming their successors, no single file shows the whole table. An enum or a documented diagram fixes that.
- **Shared data has to live somewhere.** Either the context holds it and states mutate through it, or each state carries it and transitions copy. The first is simpler; the second is safer.
- **Allocation per transition** if states are objects with data. Irrelevant at interview scale; worth a sentence if pushed on a high-throughput machine.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Multiple boolean flags where one state field belongs
- A `switch` on a status enum repeated in eight methods, which is the smell state replaces
- Allowing any transition and validating nowhere, so illegal states reach the database
- Forgetting the conditional update, so two concurrent requests both transition from the same state
- Putting business logic unrelated to state into the state classes
- Serialising state objects rather than storing a discriminator""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"State versus strategy?"** Identical structure. In strategy the client picks the implementation and it rarely changes; in state the object replaces its own state in response to events, and states know their legal successors.

**"Where does the transition logic live?"** In each state, which keeps it local, or in a central table, which keeps it visible. I would use per-state for behaviour-rich machines and a central enum table when the machine mostly gates transitions.

**"How do you persist this?"** A status discriminator column, rehydrated on load. And transitions must be a conditional update guarded on the expected current state, or concurrent requests will both succeed.

**"What if two states share most of their behaviour?"** Extract the shared part into a component both delegate to. Not a base state class — that reintroduces fragile inheritance into the one place you were trying to make explicit.""",
                    ),
                    (
                        "Interview Tip",
                        """Recognise the state machine out loud and draw the transitions before writing any class. It reorders the whole interview in your favour.

> "This is a state machine, so before I write classes let me list the states and the legal transitions: Idle, HasCredit, Dispensing, and OutOfService. Inserting a coin from Idle goes to HasCredit; selecting from Idle is an error, not a no-op. Once the table is agreed I will make each state a class so an illegal transition cannot be expressed rather than merely being checked."

The last clause — unrepresentable rather than checked — is the sentence that lands.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Model a document approval workflow: Draft, InReview, Approved, Rejected, Published, Archived. An author can recall from InReview back to Draft; a rejected document can be edited and resubmitted; only Approved can be Published.

1. Write the transition table.
2. Choose classes or an enum and justify it.
3. Two reviewers approve simultaneously. What stops a double transition?
4. The state must survive a restart. What column do you store, and what happens on load?""",
                    ),
                ],
                [
                    "Multiple boolean flags are a state machine that has not been named yet.",
                    "Each state class states what it permits, so illegal combinations cannot be represented.",
                    "States carrying data — tracking number, transaction id — beat flags plus nullable fields.",
                    "Persist a discriminator and guard transitions with a conditional update.",
                    "For machines that only gate transitions, an enum table is usually the better tool.",
                ],
                [
                    "How does the state pattern differ from strategy?",
                    "Where should transition rules live — in the states or in a central table?",
                    "How do you persist a state machine and make transitions safe under concurrency?",
                    "What do you do when two states share most of their behaviour?",
                ],
            ),
        ],
    )


def _command_chain_topic() -> dict:
    return _ood_topic(
        "command-and-chain",
        "Command, Chain of Responsibility & Iterator",
        "Turning a request into an object so it can be queued, logged and undone; passing a request along handlers; and traversing without exposing internals.",
        "MEDIUM",
        16,
        [
            OD(
                "command-and-chain",
                "Command Pattern & Undo",
                "Making an action a first-class object so it can be stored, replayed and reversed.",
                12,
                "Command wraps a request — receiver, method and arguments — into an object. Once an action is an object you can put it in a queue, write it to a log, retry it, schedule it, and most importantly undo it. Undo/redo is the single most common interview prompt that requires this pattern, and it is usually the second half of a text-editor or drawing-app question.",
                [
                    (
                        "Why It Matters",
                        """A method call is ephemeral. It happens and it is gone: you cannot store it, inspect it, or reverse it.

Turning it into an object changes what is possible:

- **Undo.** Each command knows how to reverse itself, so a stack of executed commands is an undo history.
- **Queueing.** A command can be handed to a worker pool or a scheduler.
- **Logging and replay.** A durable log of commands can rebuild state — the idea behind event sourcing and write-ahead logs.
- **Retry.** A failed command can be re-executed because it still holds its arguments.
- **Macro operations.** A composite command executes several as one, which is one undo step for the user.

Interviewers ask for undo because it forces a real design decision: what exactly do you store to be able to reverse an action?

> Memory cue: command turns a verb into a noun. Everything else follows from having the noun.""",
                    ),
                    (
                        "Mental Model",
                        """A command has an `execute()` and, when undo is required, an `undo()`. It holds its receiver and its arguments.

The core design question for undo is what to store:

| Approach | Stores | Memory | Best for |
| --- | --- | --- | --- |
| **Inverse operation** | Enough to compute the reverse | Small | Operations with a clean inverse: insert reverses delete |
| **Memento** | A snapshot of the prior state | Large | Operations with no clean inverse: a global reformat |
| **Snapshot plus log** | Periodic snapshots and commands between | Balanced | Long histories where full snapshots are too big |

Most real editors use inverse operations with periodic snapshots. Saying that, rather than picking one blindly, is the answer that shows judgement.""",
                    ),
                    (
                        "How It Works",
                        """### Command with undo

```java
public interface Command {
    void execute();
    void undo();
}

public final class InsertText implements Command {
    private final Document document;
    private final int position;
    private final String text;

    public InsertText(Document document, int position, String text) {
        this.document = document;
        this.position = position;
        this.text = text;
    }

    public void execute() { document.insert(position, text); }
    public void undo()    { document.delete(position, text.length()); }
}

public final class DeleteRange implements Command {
    private final Document document;
    private final int start;
    private final int length;
    private String removed;            // captured during execute, needed for undo

    public void execute() {
        removed = document.textBetween(start, start + length);
        document.delete(start, length);
    }

    public void undo() {
        document.insert(start, removed);
    }
}
```

`DeleteRange` shows the subtlety: you cannot undo a delete unless you captured what was deleted, and the only place you can capture it is inside `execute`. Candidates who write `undo()` first often miss this.

### The history stack

```java
public final class CommandHistory {
    private final Deque<Command> done = new ArrayDeque<>();
    private final Deque<Command> undone = new ArrayDeque<>();
    private final int limit;

    public void run(Command command) {
        command.execute();
        done.push(command);
        undone.clear();                      // a new action invalidates the redo branch
        if (done.size() > limit) done.removeLast();
    }

    public void undo() {
        if (done.isEmpty()) return;
        Command command = done.pop();
        command.undo();
        undone.push(command);
    }

    public void redo() {
        if (undone.isEmpty()) return;
        Command command = undone.pop();
        command.execute();
        done.push(command);
    }
}
```

Two details interviewers look for. `undone.clear()` on a new action — doing something after undoing discards the redo branch, which is how every editor behaves. And the size limit, because an unbounded history is a memory leak.

### Macro commands compose

```java
public final class MacroCommand implements Command {
    private final List<Command> commands;

    public void execute() { commands.forEach(Command::execute); }

    public void undo() {
        for (int i = commands.size() - 1; i >= 0; i--) commands.get(i).undo();   // reverse order
    }
}
```

Undo must run backwards. Forwards is the bug people write first, and it silently produces wrong results only when the commands interact.

### Memento, for when there is no inverse

```java
public record DocumentMemento(String content, int cursor) {}

public final class ReformatAll implements Command {
    private final Document document;
    private DocumentMemento before;

    public void execute() {
        before = document.snapshot();
        document.reformat();
    }

    public void undo() { document.restore(before); }
}
```

The memento is opaque to the command: only the document knows how to produce and consume it. That encapsulation is the point of the pattern — the command gets undo without learning the document's internals.""",
                    ),
                    (
                        "Example",
                        """A drawing app, where the interviewer's follow-up is always "now make undo work across a group operation".

```java
public interface Command { void execute(); void undo(); }

public final class MoveShape implements Command {
    private final Shape shape;
    private final int dx, dy;

    public void execute() { shape.translate(dx, dy); }
    public void undo()    { shape.translate(-dx, -dy); }      // clean inverse, no snapshot
}

public final class GroupMove implements Command {
    private final MacroCommand macro;                          // one undo step for the user

    public void execute() { macro.execute(); }
    public void undo()    { macro.undo(); }
}
```

Dragging five shapes together is one `GroupMove`, so one Ctrl+Z puts all five back. If each move were pushed separately the user would press undo five times, which is a user-visible bug that comes directly from the design.

The memory answer, if pushed: `MoveShape` stores two integers, so a thousand-step history is trivial. A `ReformatAll` storing a full snapshot is not, which is why real editors cap history and snapshot periodically rather than storing everything.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Undo and redo in editors, drawing tools and IDEs
- Job and task queues, where a queued item is a command object
- Transactional scripts and sagas, where each step has a compensating command
- Menu items, keyboard shortcuts and buttons all bound to the same command object
- Write-ahead logs and event sourcing, which are durable command logs""",
                    ),
                    (
                        "Trade-offs",
                        """- **A class per operation.** Twenty operations is twenty commands. Lambdas help for simple ones, but undo usually needs captured state, so a class is often honest.
- **Undo memory grows with history.** Inverse operations are cheap; mementos are not. Cap the history and consider periodic snapshots.
- **Commands must capture what they need at execute time.** A command holding a reference to mutable state can undo into the wrong thing if that state changed.
- **Not everything is reversible.** Sending an email, charging a card. The honest answer is a compensating action — a refund, a retraction — not an undo.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Writing `undo()` without capturing the prior state during `execute()`
- Undoing a macro in forward order instead of reverse
- Forgetting to clear the redo stack when a new command runs
- An unbounded history stack, which is a slow memory leak
- Storing a full snapshot for operations that have a cheap inverse
- Treating an external side effect as undoable instead of designing a compensating action""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"How do you implement undo?"** Each command stores what it needs to reverse itself — the inverse arguments where one exists, or a memento snapshot where it does not — and a stack of executed commands gives the history.

**"How do you undo a delete?"** Capture the deleted content inside `execute` before removing it. There is no other point at which it is available.

**"What about memory?"** Cap the history depth, prefer inverse operations over snapshots, and for large documents snapshot periodically and replay commands forward from the nearest snapshot.

**"What if an operation cannot be undone?"** Then it is not an undo, it is a compensating action. A charge is reversed by a refund, which is a new operation with its own record — and the user should be told that.

**"Command versus a queued job?"** The same object. A command is what you put on the queue; the queue adds durability, retry and scheduling.""",
                    ),
                    (
                        "Interview Tip",
                        """When asked for undo, lead with what you store, not with the class diagram.

> "Each command captures what it needs to reverse itself at execute time — `InsertText` only needs the position and length, but `DeleteRange` has to capture the removed text before it deletes it. History is a bounded stack, a new command clears the redo branch, and a group drag is one macro command so the user gets one undo step rather than five."

That covers the pattern, the subtle capture-during-execute point, the memory bound, and a user-visible behaviour — in one answer.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Design undo/redo for a spreadsheet supporting: edit a cell, paste a range, sort a column, and insert a row.

1. Which of the four have a clean inverse and which need a memento?
2. Sorting a 100,000-row column — what do you store, and what is the memory cost?
3. A formula in another cell recalculates when its input changes. Does undoing the edit also undo the recalculation? What does that imply about where undo lives?""",
                    ),
                ],
                [
                    "A command turns an action into an object that can be queued, logged, retried and undone.",
                    "Capture the state needed for undo during execute, before the change happens.",
                    "Undo a macro in reverse order; a new command clears the redo stack.",
                    "Inverse operations are cheap; mementos are expensive — cap the history either way.",
                    "External side effects get compensating actions, not undo.",
                ],
                [
                    "How would you implement undo and redo?",
                    "How do you undo a deletion?",
                    "What is your strategy when history memory becomes a problem?",
                    "What do you do about operations that cannot be reversed?",
                ],
            ),
            OD(
                "chain-of-responsibility",
                "Chain of Responsibility & Iterator",
                "Passing a request along a line of handlers, and traversing a collection without exposing how it is stored.",
                11,
                "Chain of responsibility decouples a sender from whichever handler ends up dealing with a request — it is the pattern behind every middleware stack and approval workflow. Iterator gives a client a way to walk a collection without knowing whether it is an array, a tree or a paged remote resource. Both are patterns you have used without naming, which makes them easy marks in an interview.",
                [
                    (
                        "Why It Matters",
                        """**Chain of responsibility** appears whenever a request must pass several checks whose composition varies. An HTTP request goes through authentication, rate limiting, validation and logging. An expense claim goes to a manager, then a director, then finance, depending on amount.

Without the pattern, one method contains every check in a fixed order and every new rule edits it. With it, each handler is independent and the chain is assembled at wiring time.

**Iterator** matters because it is how you expose a sequence without exposing the structure holding it. Returning your internal `ArrayList` lets callers mutate it; returning an iterator does not. And once a collection is lazily loaded or paged from a remote service, an iterator is the only interface that still works.

> Memory cue: chain of responsibility is about who handles it. Iterator is about how you walk it without knowing what it is.""",
                    ),
                    (
                        "Mental Model",
                        """**Chain:** each handler holds the next one, does its part, and either stops or passes along. Two variants:

| Variant | Behaviour | Example |
| --- | --- | --- |
| **First-match** | The first capable handler stops the chain | Expense approval by amount; exception handlers |
| **Pipeline** | Every handler runs unless one short-circuits | HTTP middleware, servlet filters |

Interviewers often blur the two; naming which one you are building is part of the answer.

**Iterator:** an object with `hasNext()` and `next()` that holds the traversal position, so a collection can be walked without exposing its internals and can be walked by several clients at once.""",
                    ),
                    (
                        "How It Works",
                        """### Chain of responsibility

```java
public abstract class ApprovalHandler {
    private ApprovalHandler next;

    public ApprovalHandler then(ApprovalHandler next) {
        this.next = next;
        return next;
    }

    public final ApprovalResult handle(ExpenseClaim claim) {
        if (canApprove(claim)) return approve(claim);
        if (next == null) return ApprovalResult.escalatedToNobody(claim);
        return next.handle(claim);
    }

    protected abstract boolean canApprove(ExpenseClaim claim);
    protected abstract ApprovalResult approve(ExpenseClaim claim);
}

public final class ManagerApproval extends ApprovalHandler {
    protected boolean canApprove(ExpenseClaim claim) {
        return claim.amount().isAtMost(Money.ofDollars(1_000));
    }
    protected ApprovalResult approve(ExpenseClaim claim) {
        return ApprovalResult.approvedBy(Role.MANAGER, claim);
    }
}
```

Two details to raise. The end of the chain must do something explicit — returning silently when nobody handled a request is a bug that hides. And `handle` is `final` so a subclass cannot skip the forwarding, which is template method reused inside the chain.

### The pipeline variant

```java
public interface Middleware {
    Response handle(Request request, Chain chain);
}

public final class RateLimiting implements Middleware {
    public Response handle(Request request, Chain chain) {
        if (!limiter.allow(request.clientKey())) return Response.tooManyRequests();
        return chain.proceed(request);                  // short-circuit or continue
    }
}

public final class Timing implements Middleware {
    public Response handle(Request request, Chain chain) {
        long start = System.nanoTime();
        try {
            return chain.proceed(request);
        } finally {
            metrics.record(request.path(), System.nanoTime() - start);   // work after, too
        }
    }
}
```

This shape lets a handler run code before *and* after the rest of the chain, which the classic first-match variant cannot. Every web framework's middleware works this way, which makes it the version worth knowing.

Order is load-bearing: rate limiting before authentication protects the auth service from floods but rate-limits by IP rather than by user; after authentication it can limit per user but does the auth work first. Saying which you chose and why is the senior part.

### Iterator

```java
public final class RingBuffer<T> implements Iterable<T> {
    private final Object[] items;
    private int head, size;

    public Iterator<T> iterator() {
        return new Iterator<>() {
            private int visited = 0;

            public boolean hasNext() { return visited < size; }

            @SuppressWarnings("unchecked")
            public T next() {
                if (!hasNext()) throw new NoSuchElementException();
                return (T) items[(head + visited++) % items.length];
            }
        };
    }
}
```

Implementing `Iterable` means the type works in a for-each loop and callers never learn that the storage wraps around. Two follow-ups to be ready for: what happens if the collection is modified during iteration — fail fast with a modification counter, or iterate a snapshot — and whether the iterator is lazy, which matters when it is paging from a remote service.""",
                    ),
                    (
                        "Example",
                        """An API request pipeline, assembled in the composition root.

```java
Handler api = Pipeline.of(
    new RequestLogging(logger),
    new Timing(metrics),
    new Authentication(tokens),
    new RateLimiting(limiter),        // after auth, so limits are per user
    new Validation(schemas),
    new Authorization(policies)
).terminatedBy(new OrderController(placeOrder));
```

Every concern is a class that can be unit tested with a stub chain. Turning off rate limiting in a test environment is deleting one line. Adding request tracing is inserting one.

The order encodes real decisions: logging outermost so even rejected requests are logged; timing next so the number includes everything; authentication before rate limiting so limits are per user; authorization last because it needs the validated body. An interviewer who asks "why that order?" is asking whether the order was chosen or copied.""",
                    ),
                    (
                        "Common Use Cases",
                        """- HTTP middleware, servlet filters, gRPC interceptors
- Approval workflows where the handler depends on amount, role or region
- Event and exception handling, where the first capable handler wins
- Iterator: any custom collection, lazy pagination over a remote API, tree traversal
- Logging frameworks, where a record passes through appenders and filters""",
                    ),
                    (
                        "Trade-offs",
                        """- **A request may fall off the end unhandled.** Always terminate the chain explicitly with a default handler or an error.
- **Debugging a long chain is indirect.** Which handler produced this response is not obvious from a stack trace; name handlers and log the chain.
- **Order is invisible in the handlers.** The behaviour lives in the wiring, so the composition root deserves a comment.
- **Iterators can be invalidated.** Fail-fast iteration throws on concurrent modification; snapshot iteration is safe but can be stale and costs a copy.
- **Lazy iterators hide cost and hold resources.** An iterator over a remote resource may keep a connection open longer than a caller expects.""",
                    ),
                    (
                        "Common Mistakes",
                        """- No terminal handler, so an unmatched request silently returns nothing
- Handlers that depend on each other's side effects, which makes the order fragile in an undocumented way
- Rate limiting placed where it cannot see the identity it is supposed to limit
- Returning an internal collection instead of an iterator, letting callers mutate it
- Ignoring concurrent modification and getting non-deterministic iteration bugs
- Confusing the first-match and pipeline variants when explaining the pattern""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"What happens if no handler handles the request?"** The chain must end in an explicit terminal — a default handler or an error response. Falling off the end silently is the classic bug.

**"Does the order of handlers matter?"** Always. Authentication before rate limiting gives per-user limits but does auth work for floods; the reverse protects auth but limits by IP. It is a deliberate choice either way.

**"How does this differ from decorator?"** A decorator always delegates and always adds behaviour. A chain handler may stop the chain entirely. The pipeline variant sits right on the boundary, and saying so is more honest than forcing a distinction.

**"What happens if the collection changes during iteration?"** Either fail fast with a modification count, which surfaces the bug immediately, or iterate over a snapshot, which is safe and possibly stale. Java's collections do the first; `CopyOnWriteArrayList` does the second.

**"Why return an iterator rather than the list?"** So callers cannot mutate internal state, and so the storage can change — including to something lazily paged — without changing the caller.""",
                    ),
                    (
                        "Interview Tip",
                        """Build the chain out loud in wiring order and justify one adjacency. That single justification signals you have operated a real system.

> "I will make each cross-cutting concern a handler in a pipeline: logging, timing, authentication, rate limiting, validation, authorization, then the controller. Rate limiting deliberately sits after authentication so the limit is per user rather than per IP — the trade is that we do the token verification even for a client that is about to be throttled, which I would accept unless auth turned out to be the bottleneck."

You have named the pattern, the order, and the cost of the order you chose.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Design the handler chain for a payment API: idempotency-key deduplication, authentication, per-merchant rate limiting, request validation, fraud scoring, and the actual charge.

1. Give the order and justify two adjacent pairs.
2. Which handlers can short-circuit, and what do they return?
3. Fraud scoring calls a slow external service. Where does a timeout belong, and what happens to the rest of the chain when it fires?""",
                    ),
                ],
                [
                    "Chain of responsibility decouples a sender from whichever handler deals with the request.",
                    "First-match stops at the first capable handler; a pipeline runs all unless one short-circuits.",
                    "Always terminate the chain explicitly — falling off the end is a silent bug.",
                    "Handler order is a design decision that lives in the wiring, so document it.",
                    "Returning an iterator instead of the collection protects internals and allows lazy storage.",
                ],
                [
                    "What happens when no handler in the chain handles a request?",
                    "Does handler order matter? Give an example where it does.",
                    "How is a chain handler different from a decorator?",
                    "What happens if a collection is modified while being iterated?",
                ],
            ),
        ],
    )


# ---------------------------------------------------------------------------
# Module 6 — Architecture in the small
# ---------------------------------------------------------------------------


def _layering_topic() -> dict:
    return _ood_topic(
        "layering-and-repository",
        "Layering, Repository & MVC",
        "Where a class belongs, how persistence is abstracted, and the presentation patterns interviewers name.",
        "MEDIUM",
        17,
        [
            OD(
                "layering-and-repository",
                "Layers & the Repository Pattern",
                "Giving every class a home, and hiding persistence behind a collection-shaped interface.",
                12,
                "When an LLD interviewer asks for packages rather than classes, they are asking about layering. A layered design answers \"where does this go?\" before the argument starts, and the repository pattern is the specific mechanism that keeps the database out of your domain. Both are standard vocabulary and both are easy marks once you can name the rules.",
                [
                    (
                        "Why It Matters",
                        """Without layers, a codebase has no answer to "where does this belong?", so it goes wherever the person writing it was already working. Controllers grow SQL, domain classes grow HTTP annotations, and the only way to test a pricing rule is to start a web server.

Layering gives three things: a place for every class, a rule about which direction dependencies may point, and — because of that rule — a domain you can test with no infrastructure at all.

The repository is the piece that makes it real. A domain that calls JDBC is not a domain; it is a database client. A domain that calls `orders.byId(id)` against an interface it owns can be exercised with a `HashMap`.

> Memory cue: dependencies point inward. The domain imports nothing; everything imports the domain.""",
                    ),
                    (
                        "Mental Model",
                        """Four layers, and one rule.

| Layer | Contains | May depend on |
| --- | --- | --- |
| **Presentation** | Controllers, CLI, request and response DTOs | Application |
| **Application** | Use-case classes, orchestration, transactions | Domain |
| **Domain** | Entities, value objects, policies, repository interfaces | Nothing |
| **Infrastructure** | JDBC, HTTP clients, message brokers, repository implementations | Domain |

The rule: **dependencies point inward.** Infrastructure implements interfaces the domain declares, which is why the arrow from infrastructure to domain is not a violation.

The repository specifically: an interface that looks like an in-memory collection of aggregates, declared by the domain, implemented by infrastructure.

| | Repository | DAO |
| --- | --- | --- |
| Granularity | One per aggregate root | Often one per table |
| Vocabulary | Domain terms: `overdueLoans()` | Data terms: `selectWhereDueDateLessThan()` |
| Returns | Domain objects | Rows or records |
| Owned by | The domain | The persistence layer |

They overlap in practice. The distinction interviewers want is that a repository speaks the domain's language.""",
                    ),
                    (
                        "How It Works",
                        """### The repository interface belongs to the domain

```java
// domain/Orders.java - no SQL, no vendor types, no annotations
public interface Orders {
    Optional<Order> byId(OrderId id);
    List<Order> awaitingShipment();
    void save(Order order);
}
```

```java
// infrastructure/JdbcOrders.java - depends on domain, never the reverse
public final class JdbcOrders implements Orders {
    private final JdbcTemplate jdbc;

    public Optional<Order> byId(OrderId id) {
        return jdbc.query("SELECT * FROM orders WHERE id = ?", this::toOrder, id.value())
                   .stream().findFirst();
    }
}
```

The test fake is the payoff:

```java
public final class InMemoryOrders implements Orders {
    private final Map<OrderId, Order> byId = new LinkedHashMap<>();

    public Optional<Order> byId(OrderId id)   { return Optional.ofNullable(byId.get(id)); }
    public List<Order> awaitingShipment()     { return byId.values().stream()
                                                     .filter(Order::isPaid).toList(); }
    public void save(Order order)             { byId.put(order.id(), order); }
}
```

Every use-case test now runs in memory. That is the single biggest practical benefit of layering and it is worth stating in exactly those terms.

### Query methods, not a query language

```java
// Leaky: the caller now writes persistence logic, and every store must speak SQL.
List<Order> find(String whereClause);

// Intention-revealing: the name is a domain concept and the store chooses how.
List<Order> awaitingShipment();
List<Order> placedBetween(Instant from, Instant to);
```

The second style keeps SQL inside infrastructure. Its cost is a method per query, which is why large systems eventually add a specification object or accept a narrow query type — worth mentioning if the interviewer pushes on method explosion.

### Where transactions and DTOs go

**Transactions** belong at the application layer, around a use case. The domain should not know that a database exists, and a controller should not decide what commits together.

**DTOs** belong at the boundaries. A request object is not a domain entity: it is unvalidated input shaped by an API contract. Mapping between them is deliberate work that stops an API change from becoming a domain change.

### Aggregates keep repositories honest

A repository exists per **aggregate root** — the entity that owns a consistency boundary. `Order` is an aggregate root; `OrderLine` is not, and there is no `OrderLineRepository`. Lines are loaded and saved with their order, which is what makes "an order's total always matches its lines" enforceable.

Getting that right also answers a common follow-up: too many repositories usually means the aggregates were not identified.""",
                    ),
                    (
                        "Example",
                        """One feature, all four layers, with each responsibility visible.

```java
// presentation
@PostMapping("/orders/{id}/ship")
ShipResponse ship(@PathVariable String id, @RequestBody ShipRequest body) {
    var result = shipOrder.handle(new OrderId(id), new TrackingNumber(body.tracking()));
    return ShipResponse.from(result);                       // DTO out, never the entity
}

// application - orchestration and the transaction boundary
public final class ShipOrder {
    @Transactional
    public ShipResult handle(OrderId id, TrackingNumber tracking) {
        Order order = orders.byId(id).orElseThrow(() -> new OrderNotFound(id));
        order.ship(tracking, clock.instant());              // the rule lives in the entity
        orders.save(order);
        events.publish(new OrderShipped(id, tracking));
        return ShipResult.shipped(id, tracking);
    }
}

// domain - the rule, with no infrastructure anywhere in sight
public final class Order {
    public void ship(TrackingNumber tracking, Instant now) {
        if (!(state instanceof Paid)) throw new IllegalTransition(state, "SHIPPED");
        this.state = new Shipped(tracking, now);
    }
}
```

Trace the dependencies: presentation knows application, application knows domain, domain knows nothing. The "can only ship a paid order" rule is testable with three lines and no Spring, no database and no HTTP — which is exactly the claim layering makes.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Any LLD prompt where the interviewer asks for packages or modules, not just classes
- Explaining how you would test business logic without a database
- Hexagonal, ports-and-adapters and clean architecture questions
- Justifying why a request DTO and a domain entity are different classes""",
                    ),
                    (
                        "Trade-offs",
                        """- **Mapping between layers is real work.** DTO to domain to row is two mappings. The payoff is that an API change does not become a schema change.
- **Repositories can hide expensive queries.** `awaitingShipment()` looks free and may scan a table. Same trap as a lazy proxy.
- **Query method explosion.** Twenty query methods on one repository is common and awkward; specifications or a narrow query object are the usual escape.
- **Layering is overhead for small systems.** A CRUD service with no rules gains little from four layers, and saying so is better than applying it dogmatically.
- **ORMs blur the boundary.** Entities with persistence annotations are not pure domain objects. That is a pragmatic compromise most teams accept; name it rather than pretending otherwise.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Putting the repository interface in the infrastructure package, which removes the inversion
- Returning ORM entities or rows from a controller, so the API is coupled to the schema
- Business rules in the controller or in the repository instead of the domain
- A repository per table rather than per aggregate root
- Transactions started in the controller or inside the domain
- Exposing a `find(String sql)` style method that pushes persistence logic to callers""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"Where does the repository interface live?"** In the domain. That is what makes the dependency point inward. If it lives with the JDBC implementation, the domain still depends on infrastructure.

**"Repository or DAO?"** A repository is per aggregate root and speaks domain language; a DAO is usually per table and speaks data language. In practice they overlap; the distinction I care about is whether the domain had to learn about rows.

**"Where do transactions belong?"** At the application layer, around a use case. The domain must not know a database exists, and the controller should not decide the unit of work.

**"Why not return the entity from the controller?"** Because the API contract and the persistence model would be locked together. Adding a column would change the public API, and a lazy relation could serialise unexpectedly.

**"Is this overkill for a small service?"** Often yes. For a CRUD service with no real rules I would collapse application and domain. The value appears when there is business logic worth protecting.""",
                    ),
                    (
                        "Interview Tip",
                        """Draw packages before classes and state the dependency rule in one sentence. It takes ten seconds and frames everything that follows.

> "Four packages. `domain` has `Order`, `Money` and the `Orders` interface, and imports nothing. `application` has `ShipOrder` and owns the transaction. `infrastructure` has `JdbcOrders` and implements the domain's interface. `web` has the controller and DTOs. Dependencies only point inward, which means the shipping rule is testable with an in-memory `Orders` and nothing else running."

Every follow-up about testing, transactions or swapping the database is now already answered.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """A library system needs: search the catalogue, borrow a copy, return a copy with a late fee, and a nightly overdue-notice job.

1. Assign every class you would create to one of the four layers.
2. Which repositories exist, and what does that tell you about the aggregates?
3. The late fee rule is "25 cents a day, capped at the replacement cost". Which layer owns it, and write the test you would use — naming exactly what has to be faked.""",
                    ),
                ],
                [
                    "Dependencies point inward: the domain imports nothing and everything imports it.",
                    "The repository interface belongs to the domain; its implementation to infrastructure.",
                    "One repository per aggregate root, not per table.",
                    "Transactions live at the application layer, around a use case.",
                    "DTOs at the boundary keep an API change from becoming a domain change.",
                ],
                [
                    "Which package should a repository interface live in, and why?",
                    "What is the difference between a repository and a DAO?",
                    "Where do transaction boundaries belong in a layered design?",
                    "Why not return persistence entities directly from a controller?",
                ],
            ),
            OD(
                "mvc-and-presentation",
                "MVC, MVP and MVVM",
                "The three presentation patterns by name, and what each one moves out of the view to make it testable.",
                10,
                "Interviewers name these three and expect you to distinguish them. All three separate presentation from domain; they differ in who talks to whom and, consequently, in how much of the UI can be tested without a UI. Knowing the difference is worth a few easy minutes in any interview that touches a client application.",
                [
                    (
                        "Why It Matters",
                        """A view class that contains business rules cannot be tested without instantiating the UI framework, and the rules cannot be reused by a second view. Every one of these patterns exists to move decisions out of the view.

The question "MVC, MVP or MVVM?" is really "how does the view learn that something changed, and how much logic is left in it?" That is a design question with observable consequences, which is why interviewers like it.

> Memory cue: MVC the view observes the model; MVP the presenter pushes to a view interface; MVVM the view binds to an exposed state object.""",
                    ),
                    (
                        "Mental Model",
                        """| | MVC | MVP | MVVM |
| --- | --- | --- | --- |
| Middle role | Controller | Presenter | ViewModel |
| View knows about | The model (observes it) | Its presenter | Its view model (via binding) |
| Middle knows about | The model | A view **interface** | Nothing about the view |
| Update mechanism | View observes model | Presenter calls view methods | Data binding |
| View testability | Moderate | High — mock the view interface | High — test the view model directly |
| Typical home | Server-rendered web | Classic desktop, older Android | WPF, modern Android, Vue and React state |

The progression is a steady reduction in what the view is allowed to decide, and a steady increase in what can be tested without a screen.""",
                    ),
                    (
                        "How It Works",
                        """### MVC

The controller handles input and updates the model; the view observes the model and re-renders.

```java
public final class OrderController {
    private final PlaceOrder placeOrder;

    public ModelAndView submit(OrderForm form) {
        OrderId id = placeOrder.handle(form.toCommand());
        return new ModelAndView("confirmation", Map.of("orderId", id.value()));
    }
}
```

On the server, "the view observes the model" collapses into "the controller hands the view a model and the view renders once", which is why server-side MVC feels different from the original desktop formulation. Saying that distinction shows you know where the pattern came from.

The failure mode is the fat controller: validation, formatting and business rules migrate into it because it is the only place the request is available. The fix is the same as always — push rules into the domain and orchestration into a use case, leaving the controller to translate.

### MVP

The presenter holds a reference to a **view interface** and pushes updates into it. The view is passive and contains no decisions.

```java
public interface LoginView {
    void showProgress();
    void hideProgress();
    void showError(String message);
    void navigateToHome();
}

public final class LoginPresenter {
    private final LoginView view;
    private final Authenticator authenticator;

    public void onLoginClicked(String username, char[] password) {
        view.showProgress();
        try {
            authenticator.login(username, password);
            view.navigateToHome();
        } catch (InvalidCredentials e) {
            view.showError("Username or password is incorrect");
        } finally {
            view.hideProgress();
        }
    }
}
```

The presenter is testable with a fake `LoginView` that records calls, and the assertions read as user-visible behaviour: progress shown, error shown, no navigation. That is the whole appeal of MVP.

The cost is a wide view interface — a method per thing the view can be told — and it grows with the screen.

### MVVM

The view model exposes observable state; the view binds to it and the view model never references the view at all.

```java
public final class LoginViewModel {
    public final Observable<Boolean> loading = new Observable<>(false);
    public final Observable<String> errorMessage = new Observable<>("");
    public final Observable<Boolean> loginEnabled = new Observable<>(false);

    public void onLoginClicked(String username, char[] password) {
        loading.set(true);
        authenticator.loginAsync(username, password)
            .thenRun(() -> navigation.set(Route.HOME))
            .exceptionally(e -> { errorMessage.set("Invalid credentials"); return null; })
            .whenComplete((ok, e) -> loading.set(false));
    }
}
```

Testing asserts on state rather than on calls: after a failed login, `loading` is false and `errorMessage` is set. No view interface to maintain and no mock to write.

The cost is a binding mechanism, and debugging goes through it — a value changes and the reason is somewhere in a subscription. React's component state and hooks are MVVM by another name, which is a useful thing to point out.""",
                    ),
                    (
                        "Example",
                        """The same screen, and the one test each pattern makes easy.

```java
// MVP: assert on what the view was told.
var view = new RecordingLoginView();
new LoginPresenter(view, alwaysFails).onLoginClicked("sam", "wrong".toCharArray());

assertTrue(view.errorShown());
assertFalse(view.navigated());
assertFalse(view.progressVisible());
```

```java
// MVVM: assert on exposed state.
var vm = new LoginViewModel(alwaysFails);
vm.onLoginClicked("sam", "wrong".toCharArray());

assertEquals("Invalid credentials", vm.errorMessage.get());
assertFalse(vm.loading.get());
```

Both tests run with no screen. The difference is that MVP verifies interactions — which couples the test to the view interface — and MVVM verifies state, which survives a redesign of how the screen displays that state. That is the same fakes-over-mocks argument in a new setting, and connecting the two is a good thing to do out loud.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Server-rendered web applications, which are MVC by convention
- Desktop and older mobile applications, where MVP dominated
- Modern mobile and reactive front ends, which are MVVM or close to it
- Any interview question about testing UI logic without a UI""",
                    ),
                    (
                        "Trade-offs",
                        """- **MVC is the least ceremony and the easiest to let rot.** Controllers accumulate logic because everything is available there.
- **MVP is very testable and verbose.** A wide view interface per screen, and the presenter must be told about every view state.
- **MVVM removes the view interface and adds a binding framework.** Less code, more indirection to debug.
- **All three can be defeated the same way.** If business rules live in the controller, presenter or view model rather than the domain, none of the patterns has bought you anything.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Business rules in the controller, presenter or view model instead of the domain
- A presenter that references a concrete view class instead of an interface, losing all testability
- A view model that holds a reference to the view, which is the one thing MVVM forbids
- View models that grow into god objects because every screen concern lands there
- Treating the pattern as the architecture — these are presentation patterns, not a substitute for layering""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"MVC versus MVP?"** In MVC the view observes the model directly and the controller handles input. In MVP the view is passive behind an interface and the presenter pushes every update to it, which makes presentation logic unit-testable with a fake view.

**"What does MVVM add over MVP?"** It removes the view interface. The view model exposes observable state and never knows the view exists, so tests assert on state instead of on recorded calls.

**"Where do business rules go in all three?"** The domain. None of these patterns is a place for business logic; they only decide how presentation is separated.

**"Why has MVVM become common?"** Declarative binding frameworks made it cheap, and asserting on state produces tests that survive UI redesigns better than interaction assertions do.""",
                    ),
                    (
                        "Interview Tip",
                        """Answer with the direction of the dependencies, not with a definition. It is shorter and it is the part that actually differs.

> "The three differ in who knows whom. In MVC the view observes the model. In MVP the presenter holds a view interface and pushes updates, so I can test presentation with a recording fake. In MVVM the view model only exposes observable state and never references the view, so my tests assert on state. In all three the business rules stay in the domain — otherwise none of them has helped."

The last sentence is the one that separates a design answer from a definition.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """A seat-selection screen shows a seat map, disables unavailable seats, enforces a maximum of six seats, shows a running total, and disables Continue until at least one seat is chosen.

1. Which of those five behaviours are presentation logic and which are domain rules?
2. Design the view model, listing its observable state and its methods.
3. Write the two assertions you would make after selecting a seventh seat, and say what the user sees.""",
                    ),
                ],
                [
                    "The three patterns differ in who knows whom, not in what they separate.",
                    "MVP makes the view passive behind an interface; tests use a recording fake.",
                    "MVVM exposes observable state and never references the view; tests assert on state.",
                    "State assertions survive UI redesigns better than interaction assertions.",
                    "Business rules belong in the domain in all three; none of them is an architecture.",
                ],
                [
                    "How do MVC, MVP and MVVM differ?",
                    "What does MVVM give you that MVP does not?",
                    "Where do business rules belong in each of the three?",
                    "How would you unit test presentation logic without a UI?",
                ],
            ),
        ],
    )


def _concurrency_topic() -> dict:
    return _ood_topic(
        "concurrency-in-lld",
        "Concurrency in Low-Level Design",
        "The follow-up every LLD interview reaches: make this thread-safe — and how to do it without a lock around everything.",
        "HARD",
        18,
        [
            OD(
                "concurrency-in-lld",
                "Thread-Safe Object Design",
                "Finding the shared mutable state, choosing the smallest thing to protect, and saying so precisely.",
                14,
                "Almost every low-level design interview ends with some version of \"now multiple threads use this\". It is a deliberate stress test: the design you drew assuming one thread has to survive contact with several. The good news is that the analysis is mechanical — find the shared mutable state, decide who may touch it, and choose the cheapest mechanism that holds.",
                [
                    (
                        "Why It Matters",
                        """Concurrency bugs are the ones that reach production. They pass every test, appear under load, and cannot be reproduced on a laptop. Interviewers ask about them because the reasoning is visible in a design review and invisible in a code review.

The specific failure they are looking for is check-then-act:

```java
if (spots.isAvailable(spotId)) {      // thread A and thread B both see true
    spots.occupy(spotId, vehicle);    // both occupy it; one car is parked on another
}
```

Two threads, one spot, two tickets. Nothing about that code looks wrong, and it is wrong. The fix is not "add `synchronized` to the class" — it is to make the check and the act one atomic step.

> Memory cue: there is no bug without shared **mutable** state. Remove the sharing or remove the mutation and the problem disappears.""",
                    ),
                    (
                        "Mental Model",
                        """Work through it in this order. Stop as soon as the problem is gone.

1. **Is the state shared?** A local variable or a per-request object needs nothing.
2. **Is it mutable?** Immutable objects are safe to share with no synchronisation at all.
3. **Can it be confined?** One thread owning the data, or a per-thread copy, beats any lock.
4. **Is there a concurrent collection that already does this?** `ConcurrentHashMap`, `AtomicLong`, `BlockingQueue`.
5. **Only then, lock.** And lock the smallest region that keeps the invariant.

| Mechanism | Cost | Use for |
| --- | --- | --- |
| Immutability | None | Value objects, configuration, events |
| Confinement | None | Per-request state, single-writer designs |
| `Atomic*` | Very low | Counters, flags, single-reference swaps |
| `ConcurrentHashMap` | Low | Per-key state; `compute` makes updates atomic |
| `synchronized` / `ReentrantLock` | Moderate | Multi-field invariants that must move together |
| `ReadWriteLock` | Moderate | Read-heavy state with rare writes |""",
                    ),
                    (
                        "How It Works",
                        """### Make check-then-act one operation

```java
// Broken: two threads can both pass the check.
public Ticket park(Vehicle vehicle) {
    Spot spot = findFreeSpot(vehicle.size());
    if (spot != null) {
        spot.occupy(vehicle);
        return issueTicket(spot, vehicle);
    }
    throw new LotFull();
}
```

Three correct fixes, in increasing order of scalability.

```java
// 1. Lock the compound action. Simple, correct, and serialises all parking.
public synchronized Ticket park(Vehicle vehicle) { ... }
```

```java
// 2. Move the atomicity into the data structure. Only the queue is contended.
private final Map<VehicleSize, BlockingQueue<Spot>> free = ...;

public Ticket park(Vehicle vehicle) {
    Spot spot = free.get(vehicle.size()).poll();       // atomic take
    if (spot == null) throw new LotFull();
    return issueTicket(spot, vehicle);
}
```

```java
// 3. Per-key atomicity, when the contention is per-entity rather than global.
private final ConcurrentHashMap<SpotId, Optional<Vehicle>> occupants = ...;

occupants.compute(spotId, (id, current) -> {
    if (current.isPresent()) throw new SpotTaken(id);
    return Optional.of(vehicle);                        // runs atomically for this key
});
```

Option two is usually the best answer in an interview: it removes the lock entirely by choosing a data structure whose take operation is already atomic, and it scales because different vehicle sizes never contend.

### Lock the smallest thing that holds the invariant

Marking every method `synchronized` is correct and serialises the whole object. Instead, ask which fields must change together, and lock that group.

```java
public final class SeatInventory {
    private final ConcurrentHashMap<ShowId, Object> showLocks = new ConcurrentHashMap<>();

    public Reservation hold(ShowId show, List<Seat> seats) {
        Object lock = showLocks.computeIfAbsent(show, s -> new Object());
        synchronized (lock) {                       // per-show, not global
            if (!allFree(show, seats)) throw new SeatsUnavailable(seats);
            markHeld(show, seats);
            return new Reservation(show, seats);
        }
    }
}
```

Two showings never block each other. Saying "I would lock per show rather than per inventory" is a concrete scalability statement rather than a vague one.

### Deadlock, and the rule that prevents it

Deadlock needs four conditions at once; the practical one to break is circular wait.

```java
// Deadlock: thread A locks 1 then 2, thread B locks 2 then 1.
void transfer(Account from, Account to, Money amount) {
    synchronized (from) {
        synchronized (to) { ... }
    }
}

// Fixed: a global ordering means no cycle can form.
void transfer(Account from, Account to, Money amount) {
    Account first  = from.id().compareTo(to.id()) < 0 ? from : to;
    Account second = first == from ? to : from;
    synchronized (first) {
        synchronized (second) { ... }
    }
}
```

**Always acquire multiple locks in a consistent global order.** That one sentence is the most useful thing you can say about deadlock in an interview.

### Never hold a lock across I/O

```java
// A slow gateway now blocks every other thread waiting on this lock.
synchronized void checkout(Cart cart) {
    Money total = price(cart);
    gateway.charge(cart.method(), total);      // network call, holding the lock
    orders.save(cart);
}
```

Compute inside the lock, call out outside it, and re-acquire to commit the result — or use an optimistic update that fails and retries. The general rule: locks protect state transitions, not network round trips.

### Say which guarantee you need

Be precise about the failure you are preventing.

- **Atomicity:** the whole operation happens or none of it does. Locks and `compute`.
- **Visibility:** another thread sees the write. `volatile`, `final`, or the memory barrier a lock provides.
- **Ordering:** operations are not reordered. Also provided by `volatile` and locks.

A counter incremented without synchronisation fails on atomicity. A flag set without `volatile` fails on visibility — the other thread can loop forever on a stale value. Distinguishing the two is a strong senior signal.""",
                    ),
                    (
                        "Example",
                        """A rate limiter, made thread-safe at exactly the right granularity.

```java
public final class TokenBucketLimiter implements RateLimiter {
    private final ConcurrentHashMap<RateKey, Bucket> buckets = new ConcurrentHashMap<>();
    private final Clock clock;
    private final int capacity;
    private final double refillPerSecond;

    public boolean allow(RateKey key) {
        Bucket bucket = buckets.computeIfAbsent(key, k -> new Bucket(capacity, clock.instant()));
        synchronized (bucket) {                       // one lock per key, never global
            bucket.refill(clock.instant(), refillPerSecond, capacity);
            return bucket.tryConsume();
        }
    }

    private static final class Bucket {
        private double tokens;
        private Instant lastRefill;

        void refill(Instant now, double rate, int capacity) {
            double elapsed = Duration.between(lastRefill, now).toMillis() / 1000.0;
            tokens = Math.min(capacity, tokens + elapsed * rate);
            lastRefill = now;
        }

        boolean tryConsume() {
            if (tokens < 1) return false;
            tokens -= 1;
            return true;
        }
    }
}
```

Three decisions worth narrating. `computeIfAbsent` guarantees one bucket per key even under a race, so two threads cannot create two buckets and double the allowance. The lock is on the bucket, so different users never contend. And `tokens` and `lastRefill` must change together — refilling without updating the timestamp would grant tokens repeatedly — which is exactly why this needs a lock rather than an `AtomicInteger`.

That last sentence is the answer to "why not just use an atomic?" and it is the question a good interviewer will ask.""",
                    ),
                    (
                        "Common Use Cases",
                        """- The "now make it thread-safe" follow-up in parking lot, elevator, booking and cache problems
- Any in-memory cache, rate limiter, connection pool or id generator
- Seat and inventory reservation, where double-booking is the failure everyone tests for
- Producer-consumer designs built on a `BlockingQueue`""",
                    ),
                    (
                        "Trade-offs",
                        """- **Coarse locks are simple and do not scale.** One lock on the whole lot is provably correct and serialises every car.
- **Fine-grained locks scale and risk deadlock.** More locks means an ordering discipline you must actually maintain.
- **Lock-free is fastest and hardest.** A CAS retry loop avoids blocking and is easy to get subtly wrong; reserve it for single-variable updates.
- **Concurrent collections are atomic per operation, not per sequence.** `map.get` followed by `map.put` is still a race; `compute` is not.
- **Immutability trades allocation for safety.** Usually the right trade, and worth naming as a trade rather than a free win.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Check-then-act across two separate calls to a concurrent collection
- Adding `synchronized` to every method and calling the design scalable
- Holding a lock across a network call or a database round trip
- Acquiring two locks in different orders in different methods
- Using a non-`volatile` boolean as a stop flag, so the reading thread never sees the change
- `HashMap` shared between threads, which can corrupt internally rather than merely losing an update
- Synchronising on a mutable field, so the lock object changes underneath the holders""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"How do you make this thread-safe?"** First I find the shared mutable state, then I try to remove it — immutability or confinement. What is left gets the narrowest possible protection: a concurrent collection where one operation suffices, a per-key lock where several fields must move together.

**"Why not synchronize the whole class?"** It is correct and it serialises everything. In a parking lot that means one car at a time across the entire facility. Per-spot or per-size locking keeps correctness and allows parallelism.

**"How do you prevent deadlock?"** Acquire multiple locks in a consistent global order, keep critical sections short, never hold a lock across I/O, and use a timed `tryLock` where a wait is unacceptable.

**"Is `ConcurrentHashMap` enough?"** Only if each operation is self-contained. `get` then `put` is still a race; `compute` and `computeIfAbsent` run atomically for the key, which is what makes them the right tools.

**"What does `volatile` guarantee?"** Visibility and ordering, not atomicity. It is right for a stop flag, wrong for a counter, because `count++` is three operations.""",
                    ),
                    (
                        "Interview Tip",
                        """Answer the thread-safety question as an analysis, not as a keyword.

> "The shared mutable state is the free-spot set and the per-spot occupant. Tickets are immutable so they need nothing. I would hold free spots in a `BlockingQueue` per vehicle size, so taking one is atomic and two sizes never contend — that removes the check-then-act race without a lock. The fee policy is stateless, so it is shared safely. And I would not hold anything while calling the payment gateway."

That names the state, removes what does not need protecting, chooses a mechanism, and volunteers the I/O rule — which is the full answer.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Make this booking service safe for concurrent use.

```java
class BookingService {
    private final Map<ShowId, Set<Seat>> booked = new HashMap<>();

    Booking book(ShowId show, List<Seat> seats, Customer customer) {
        Set<Seat> taken = booked.computeIfAbsent(show, s -> new HashSet<>());
        if (seats.stream().anyMatch(taken::contains)) throw new SeatsUnavailable(seats);
        taken.addAll(seats);
        payments.charge(customer.method(), priceOf(seats));
        return new Booking(show, seats, customer);
    }
}
```

1. Name every race, including the one inside `computeIfAbsent`.
2. Fix it with the narrowest mechanism you can, and justify the granularity.
3. The payment call takes 800 ms. What must not happen while it runs, and what do you do if it fails?""",
                    ),
                ],
                [
                    "No shared mutable state means no concurrency bug — remove sharing or mutation first.",
                    "Check-then-act across two calls is the race interviewers are looking for.",
                    "Lock the smallest thing that holds the invariant: per key, per entity, not per class.",
                    "Acquire multiple locks in a consistent global order to prevent deadlock.",
                    "Never hold a lock across a network call; volatile gives visibility, not atomicity.",
                ],
                [
                    "How would you make this design thread-safe?",
                    "Why not just synchronize every method?",
                    "How do you prevent deadlock when two locks are needed?",
                    "Is a ConcurrentHashMap enough on its own? When is it not?",
                ],
            ),
            OD(
                "concurrency-building-blocks",
                "Concurrency Building Blocks",
                "The java.util.concurrent types worth naming, and the producer-consumer shape that keeps appearing.",
                12,
                "Once you have decided something needs protecting, the next question is which tool. Reaching for `synchronized` every time is a missed opportunity: the concurrency library already contains correct, tested versions of most things an interview asks you to build, and naming the right one is faster and more convincing than writing a lock by hand.",
                [
                    (
                        "Why It Matters",
                        """A candidate who says "I would use a `BlockingQueue` between the producers and the worker pool, sized to bound memory" has answered in one sentence what another candidate spends five minutes building incorrectly with `wait` and `notify`.

The library also encodes decisions you would otherwise have to justify: bounded versus unbounded, fair versus unfair, what happens when a queue is full. Knowing that a bounded queue gives you backpressure for free is the kind of detail that separates answers.

> Memory cue: if you are writing `wait()` and `notify()` in an interview in 2020s Java, there is almost certainly a class that already does it.""",
                    ),
                    (
                        "Mental Model",
                        """| Need | Reach for | Notes |
| --- | --- | --- |
| Counter or accumulator | `AtomicLong`, `LongAdder` | `LongAdder` wins under heavy contention |
| Swap a reference safely | `AtomicReference` | Compare-and-set retry loop |
| Per-key state | `ConcurrentHashMap` | `compute` and `computeIfAbsent` are atomic per key |
| Hand work between threads | `BlockingQueue` | Bounded gives backpressure |
| Run tasks in parallel | `ExecutorService` | Never create threads by hand |
| Wait for several results | `CompletableFuture` | Composition without blocking |
| One-time initialisation | Holder idiom, or `computeIfAbsent` | Avoids double-checked locking entirely |
| Read-heavy shared state | `CopyOnWriteArrayList`, `ReadWriteLock` | Copy-on-write suits rarely-changing listener lists |
| Coordinate phases | `CountDownLatch`, `CyclicBarrier`, `Semaphore` | Latch is one-shot; barrier is reusable |""",
                    ),
                    (
                        "How It Works",
                        """### Producer-consumer with a bounded queue

This shape answers a large fraction of "how would you scale this?" follow-ups.

```java
public final class NotificationDispatcher implements AutoCloseable {
    private final BlockingQueue<Notification> queue = new ArrayBlockingQueue<>(10_000);
    private final ExecutorService workers;

    public NotificationDispatcher(int threads, Notifier notifier) {
        this.workers = Executors.newFixedThreadPool(threads);
        for (int i = 0; i < threads; i++) {
            workers.submit(() -> {
                while (!Thread.currentThread().isInterrupted()) {
                    try {
                        Notification next = queue.take();      // blocks until work arrives
                        notifier.send(next.recipient(), next.message());
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();    // restore the flag, then exit
                        return;
                    } catch (RuntimeException e) {
                        log.error("delivery failed", e);       // one failure must not kill the worker
                    }
                }
            });
        }
    }

    public boolean enqueue(Notification notification) {
        return queue.offer(notification);      // false when full - the caller decides what to do
    }
}
```

Four things worth pointing out, because each is a question an interviewer may ask.

**The queue is bounded.** An unbounded queue turns a traffic spike into an out-of-memory error. Bounded means `offer` returns false and the caller must decide: reject, block, or shed.

**`InterruptedException` restores the flag.** Swallowing an interrupt makes a thread pool impossible to shut down, and it is the most common mistake in this code.

**A task failure is caught inside the loop.** Without it, one bad notification kills a worker permanently and the pool silently shrinks.

**Threads come from an executor.** `new Thread()` per task has no bound and no reuse.

### Atomics and the CAS loop

```java
private final AtomicReference<Rates> current = new AtomicReference<>(Rates.empty());

public void merge(Rates update) {
    current.updateAndGet(existing -> existing.mergedWith(update));   // retries on conflict
}
```

`updateAndGet` loops internally: read, compute, compare-and-set, retry if someone else won. It is lock-free, and it requires the function to be side-effect free because it may run several times. That caveat is worth stating — it is the trap in lock-free code.

### Choosing a pool size

An interviewer may push on the number.

- **CPU-bound work:** roughly the number of cores. More threads just add context switching.
- **I/O-bound work:** higher, because threads spend most of their time blocked. Sizing follows from the target throughput and the average wait.
- **The real answer:** measure, and bound the queue so that being wrong degrades gracefully instead of exhausting memory.

### Shutting down cleanly

```java
workers.shutdown();                                   // stop accepting, finish in-flight
if (!workers.awaitTermination(30, TimeUnit.SECONDS)) {
    workers.shutdownNow();                            // interrupt what is still running
}
```

Graceful shutdown appears in interviews as "what happens on deploy?" — and the answer is that in-flight work finishes, new work is rejected, and anything still running after a timeout is interrupted.""",
                    ),
                    (
                        "Example",
                        """A small in-memory cache with correct single-flight loading, which is a frequent follow-up.

```java
public final class LoadingCache<K, V> {
    private final ConcurrentHashMap<K, CompletableFuture<V>> entries = new ConcurrentHashMap<>();
    private final Function<K, V> loader;

    public V get(K key) {
        CompletableFuture<V> future = entries.computeIfAbsent(key, k ->
            CompletableFuture.supplyAsync(() -> loader.apply(k)));
        try {
            return future.join();
        } catch (CompletionException e) {
            entries.remove(key, future);          // do not cache a failure forever
            throw e;
        }
    }
}
```

The design point is caching the *future* rather than the value. Ten threads asking for the same missing key all get the same `CompletableFuture`, so the expensive loader runs once — the cache stampede problem solved with one line.

Storing the value instead would let all ten threads miss, all ten call the loader, and all ten write the same result. Being able to explain that difference is exactly what the "what if a thousand requests miss at once?" question is testing.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Asynchronous notification, email and analytics dispatch
- Worker pools behind a queue in any ingestion or job-processing design
- In-memory caches with single-flight loading
- Connection and resource pools, usually a `Semaphore` plus a queue
- Fan-out and fan-in over several services with `CompletableFuture`""",
                    ),
                    (
                        "Trade-offs",
                        """- **Bounded versus unbounded queues.** Bounded gives backpressure and forces a rejection policy; unbounded hides the problem until memory runs out.
- **Async decouples latency and complicates failure.** Once work leaves the request thread, the caller no longer learns whether it succeeded, so you need retries and a dead-letter path.
- **Lock-free is fast and subtle.** CAS loops can livelock under heavy contention and require side-effect-free functions.
- **Copy-on-write collections are read-optimal and write-expensive.** Right for listener lists, wrong for anything that changes frequently.
- **More threads is not more throughput.** Past the point where a resource saturates, extra threads add contention and context switching only.""",
                    ),
                    (
                        "Common Mistakes",
                        """- An unbounded queue in front of a slow consumer
- Swallowing `InterruptedException` instead of restoring the interrupt flag
- No try/catch inside a worker loop, so one failure silently removes a worker
- Creating threads directly rather than using an executor
- Caching a value rather than a future, allowing a stampede of duplicate loads
- Blocking inside a `computeIfAbsent` mapping function on the same map, which can deadlock
- Forgetting to shut the pool down, so the process never exits""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"Bounded or unbounded queue?"** Bounded, always, unless I can prove the producer is slower than the consumer. Bounded gives backpressure; unbounded converts a spike into an out-of-memory failure.

**"What happens when the queue is full?"** A policy decision I would state: reject with a 429, block the producer, or drop the lowest-priority items. Silently blocking forever is not an answer.

**"A thousand requests miss the cache for the same key. What happens?"** With a value cache, a thousand loader calls. Caching the in-flight future means one call and nine hundred and ninety-nine threads joining it.

**"How many threads in the pool?"** Around core count for CPU-bound work and higher for I/O-bound, but the honest answer is that I would measure and bound the queue so being wrong degrades instead of exploding.

**"What does restoring the interrupt flag do?"** It lets code higher up the stack — including the executor — see that a shutdown was requested. Swallowing it makes the pool impossible to stop.""",
                    ),
                    (
                        "Interview Tip",
                        """Name the building block and the policy it forces you to choose. The second half is what sounds experienced.

> "Between the request path and delivery I would put a bounded `ArrayBlockingQueue` and a fixed pool of workers. Bounded because a spike should produce a rejection rather than an out-of-memory error, which means I have to decide what `offer` returning false does — here I would return 202 with the notification dropped to a dead-letter table rather than failing the user's request."

You have chosen the tool, the bound, and the behaviour at the limit, which is the whole design.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Design the ingestion path for a metrics service: HTTP handlers receive data points and a pool of workers writes them in batches to storage.

1. Which building block sits between the handlers and the workers, and is it bounded?
2. Storage is down for thirty seconds. What happens to incoming requests, and what does a client see?
3. The service is redeployed. What must happen to the data points already in the queue?
4. One worker throws on a malformed point. What stops that from shrinking the pool?""",
                    ),
                ],
                [
                    "Prefer a library primitive to hand-written wait/notify — it encodes the decisions too.",
                    "Bounded queues give backpressure; unbounded ones turn spikes into out-of-memory errors.",
                    "Restore the interrupt flag, or the pool can never be shut down.",
                    "Catch exceptions inside a worker loop so one bad task cannot remove a worker.",
                    "Cache the in-flight future, not the value, to collapse a stampede into one load.",
                ],
                [
                    "Bounded or unbounded queue, and what happens when it is full?",
                    "A thousand threads miss the cache for one key — what does your design do?",
                    "How do you size a thread pool?",
                    "Why does swallowing InterruptedException matter?",
                ],
            ),
        ],
    )


# ---------------------------------------------------------------------------
# Module 7 — The LLD interview method
# ---------------------------------------------------------------------------


def _lld_method_topic() -> dict:
    return _ood_topic(
        "low-level-design",
        "The LLD Interview Framework",
        "A repeatable forty-five minute method: scope, model, API, walk, stress — plus how to get from requirements to classes and how to absorb the follow-ups.",
        "MEDIUM",
        19,
        [
            OD(
                "low-level-design",
                "Low-Level Design Framework",
                "The order to work in, what the interviewer is scoring at each step, and how to spend the clock.",
                16,
                "A low-level design interview is forty-five minutes of designing a small system out loud. Candidates lose it for structural reasons far more often than technical ones: they start coding before scoping, produce twenty classes with no API, or spend thirty minutes on an inheritance hierarchy nobody asked about. A framework fixes all three — it gives you a clock, it forces narration, and it puts requirements before classes.",
                [
                    (
                        "Why It Matters",
                        """The four ways this interview is lost, in order of frequency:

- **Designing the wrong thing.** Ten minutes in, the interviewer says "actually I meant multi-level parking with different vehicle sizes" and everything so far is wasted.
- **Class diagram with no behaviour.** Fifteen boxes with fields, no methods, no idea what calls what.
- **Coding too early.** Twenty minutes writing a `HashMap` lookup while the design question goes unanswered.
- **No depth anywhere.** Every part touched, nothing examined. Senior interviews are scored on depth in one or two places.

The framework below prevents each one. It is the same instinct as a system design template: agree on the problem, produce something that works, then stress it.

> Memory cue: SCOPE → MODEL → API → WALK → STRESS. Nothing gets drawn before it is justified.""",
                    ),
                    (
                        "Mental Model",
                        """Five phases and a clock.

SCOPE → MODEL → API → WALK → STRESS

| Phase | What you produce | Minutes | What is being scored |
| --- | --- | --- | --- |
| **SCOPE** | Use cases, explicit non-goals, assumptions | 5–7 | Do you design for the real problem? |
| **MODEL** | Entities, value objects, relationships, states | 8–10 | Can you find the right abstractions? |
| **API** | The public methods of each key class | 6–8 | Can you define behaviour, not just data? |
| **WALK** | One happy path and one failure, traced end to end | 6–8 | Does the design actually work? |
| **STRESS** | Concurrency, extension, scale, edge cases | 10–15 | The senior signal lives here |

The proportions matter. If you are twenty minutes in and have not named a class, you have stalled. If you finished the class diagram at minute twelve and have nothing to add, you have also lost.""",
                    ),
                    (
                        "How It Works",
                        """### 1. SCOPE — ask before you draw

Four questions cover nearly every prompt:

- Who uses this, and what are the two or three things they do most?
- What is explicitly out of scope?
- Is this a single process, or do multiple threads and machines share state?
- What varies now, and what is expected to vary later?

That last one is the highest-value question in the whole interview. "Will pricing rules change?" tells you whether to build a `FeePolicy` strategy or a method. Ask it and the interviewer will usually tell you exactly which extension point they want to see.

Then say the scope back:

> "So: a multi-level lot, three vehicle sizes, hourly pricing that will change, one process for now. I am leaving out reservations and payments beyond a fee calculation. Shout if you would rather I covered those."

### 2. MODEL — nouns, then lifetimes, then states

Identify entities and value objects, then do the two things candidates skip.

**Relationships with meaning.** Composition or aggregation for each link, stated out loud: "the lot composes spots — they die with it; a ticket aggregates a vehicle reference it does not own."

**States.** If any entity has a lifecycle, draw the transitions now rather than discovering them later. Most LLD prompts contain a state machine, and finding it early is worth more than any pattern you can name.

### 3. API — methods before fields

This is where most designs are won or lost. A class diagram of fields is a database schema; the interview is about behaviour.

```java
final class ParkingLot {
    Ticket park(Vehicle vehicle);              // throws LotFull
    Receipt leave(Ticket ticket, Instant now); // throws UnknownTicket
    int availableSpots(VehicleSize size);
}
```

Three methods, real return types, named failures. From this the interviewer can see what the system does. Keep the public surface small — two to five methods per key class — and push everything else behind it.

### 4. WALK — trace two paths out loud

Take one happy path and narrate every call:

> "`park(car)` asks the `SpotAllocator` for a free medium spot, marks it occupied, creates a `Ticket` with the spot id and entry time, stores it in the active-ticket map, and returns it."

Then one failure:

> "If no spot fits, the allocator returns empty and `park` throws `LotFull`. Nothing is mutated, so there is no partial state to clean up."

Walking the code finds bugs in your own design before the interviewer does. It is the single highest-value five minutes available.

### 5. STRESS — go deep where the points are

Cover these in roughly this order, and let the interviewer steer:

- **Concurrency.** "Two cars arrive at once" is the most common follow-up in every LLD prompt.
- **Extension.** "Now add electric vehicles with charging" or "weekend pricing".
- **Edge cases.** Lost ticket, clock skew, the lot closing with cars inside.
- **Scale.** "Ten thousand spots, ten sites" — usually the point where in-memory state becomes a repository.

Volunteering the weakest part of your own design before the interviewer finds it reads as senior. Being caught by it does not.""",
                    ),
                    (
                        "Example",
                        """The framework compressed, on "design a parking lot".

**SCOPE.** "Three vehicle sizes, multi-level, hourly fees that will change, single process. Out of scope: reservations, number-plate recognition, payment processing beyond computing a fee. Assumption: a spot fits a vehicle of its own size or smaller."

**MODEL.** Entities: `ParkingLot`, `Level`, `Spot`, `Ticket`. Values: `SpotId`, `Money`, `VehicleSize`. `Spot` has a small state machine — Free, Occupied, OutOfService. The lot composes levels, levels compose spots, a ticket aggregates a spot id.

**API.**

```java
Ticket park(Vehicle vehicle);
Receipt leave(Ticket ticket, Instant now);
int availableSpots(VehicleSize size);
```

**WALK.** "`park` asks `SpotAllocator` for the nearest free spot of a sufficient size; `Spot` transitions Free to Occupied; a `Ticket` is created with spot id and entry time. On `leave`, the fee policy prices the duration, the spot returns to Free, and a `Receipt` is returned. Unknown ticket throws; nothing is mutated first."

**STRESS.** "Concurrently, the race is two cars taking the same spot — I would hold free spots in a `BlockingQueue` per size so taking one is atomic, rather than locking the lot. For extension, `FeePolicy` is an interface, so weekend pricing is a new class. The weakest part is the in-memory active-ticket map: it does not survive a restart, and at ten sites it becomes a repository behind an interface the lot already depends on."

Every phase produced something, and the last paragraph volunteered a weakness with its fix.""",
                    ),
                    (
                        "Common Use Cases",
                        """- Any "design X" prompt where X is a single application rather than a distributed system
- Machine-coding rounds, where the same order applies with implementation after WALK
- Take-home design exercises, where the five phases are a good document outline
- Real design reviews, which is where the habit is actually built""",
                    ),
                    (
                        "Trade-offs",
                        """- **Rigid order versus the interviewer's agenda.** If they jump to concurrency, go there and return afterwards: "Good — that covers threading. Can I come back to the fee policy?"
- **Time spent on scoping.** Five minutes saves twenty; twelve minutes reads as stalling.
- **Breadth versus depth in STRESS.** You cannot deep-dive four areas. The one the interviewer keeps returning to is the rubric.
- **Pattern naming.** Naming a pattern is efficient shorthand and becomes a liability if you cannot justify it. Describe the mechanism first, name it second.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Drawing classes before agreeing what the system does
- Producing fields with no methods, which is a schema rather than a design
- Writing implementation code before the API exists
- Reciting patterns as a checklist instead of choosing one for a reason
- Designing for a million users when the prompt implies one building
- Silent thinking — the interviewer scores what they hear
- Ending with "…and that's it" instead of a summary and a named weakness""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"Where would you start?"** With requirements and explicit non-goals, then the model, then the API, then walking a path through it. I do not draw anything I cannot justify.

**"How do you decide which classes exist?"** From the use cases. I take the nouns as candidates, then keep only the ones with behaviour or identity, and I fold the rest into value objects or fields.

**"How much detail do you write?"** Signatures and relationships, not full bodies — unless it is a machine-coding round. Implementation is cheap once the API is agreed.

**"What if you run out of time?"** I summarise: the architecture in one sentence, two key decisions with their trade-offs, and the one thing I would revisit with more time. A complete design with a clear summary beats a half-finished deep dive.""",
                    ),
                    (
                        "Interview Tip",
                        """Open by stating the plan. It buys you permission to scope, and it tells the interviewer how to steer you.

> "Let me start with the use cases and what is out of scope, then the core entities, then the public API of the main classes. After that I will walk one park-and-leave through the design and then look at concurrency and extension points. Stop me anywhere you want more depth."

You have described the next forty minutes in twenty seconds, and every subsequent silence now reads as thinking rather than as being stuck.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Set a timer for seven minutes on the prompt: **"Design a car rental system."**

Produce only the SCOPE and MODEL phases — no API, no code. You are done when you have three to five use cases, at least two explicit non-goals, the entity and value-object lists, every relationship labelled as composition or aggregation, and one state machine identified.

Then check yourself against this: did you ask what is expected to vary?""",
                    ),
                ],
                [
                    "SCOPE, MODEL, API, WALK, STRESS — nothing is drawn before it is justified.",
                    "Asking what is expected to vary tells you which extension point to build.",
                    "Methods before fields: a diagram of fields is a schema, not a design.",
                    "Walking one happy path and one failure finds your own bugs before the interviewer does.",
                    "Volunteer the weakest part of your design; being caught by it scores worse.",
                ],
                [
                    "How do you start a low-level design problem?",
                    "How do you decide which classes should exist?",
                    "How much implementation detail do you write?",
                    "What do you do when time is running out?",
                ],
            ),
            OD(
                "from-requirements-to-classes",
                "From Requirements to Classes",
                "Turning a paragraph of English into entities, value objects, aggregates and responsibilities.",
                13,
                "The hardest minute of an LLD interview is the first one after scoping: you have requirements and a blank page. This lesson is the mechanical procedure that gets you from one to the other — noun and verb extraction, the tests that filter candidates down to real classes, CRC cards for assigning responsibility, and aggregates for deciding what loads and saves together.",
                [
                    (
                        "Why It Matters",
                        """Two candidates hear the same prompt. One produces `Order`, `OrderLine`, `Money`, `OrderRepository` and a state machine. The other produces `OrderManager`, `OrderHelper`, `OrderData` and `OrderUtils`. The difference is not talent — it is having a procedure.

Modelling also determines everything downstream. Get the aggregate boundaries wrong and every later question about transactions, concurrency and repositories is harder than it needs to be. Get them right and those answers fall out.

> Memory cue: nouns are candidates, not classes. A candidate becomes a class when it has behaviour or identity.""",
                    ),
                    (
                        "Mental Model",
                        """Four filters, applied in order to every candidate noun.

1. **Does it have identity?** Two instances with the same data — are they the same thing? No means it is an entity with an id. Yes means it is a value object.
2. **Does it have behaviour?** If nothing but getters, it is probably data, a field, or an attribute of something else.
3. **Does it have a lifecycle?** Multiple states and transitions means it is an entity and probably an aggregate root.
4. **Is it in scope?** Half the nouns in a prompt are outside the boundary you agreed. Drop them explicitly.

| Result | Example | Shape |
| --- | --- | --- |
| Entity | `Order`, `Member`, `Elevator` | Mutable, has an id, equality by id |
| Value object | `Money`, `SeatId`, `DateRange` | Immutable record, equality by fields |
| Aggregate root | `Order` owning `OrderLine` | The transactional and repository boundary |
| Service or policy | `FeePolicy`, `SpotAllocator` | Stateless behaviour that spans entities |
| Not a class | "system", "user interface", "data" | Drop it and say you are dropping it |""",
                    ),
                    (
                        "How It Works",
                        """### Nouns and verbs, then filter

Take a requirement sentence:

> "A member can borrow a copy of a book for two weeks. If it is returned late, a fee is charged per day up to the replacement cost."

Nouns: member, copy, book, weeks, fee, day, replacement cost.
Verbs: borrow, return, charge.

Now filter. `Member` and `Copy` are entities — two copies of the same book are different things, so identity matters. `Book` is an entity too, but a different one: `Copy` is the physical item, `Book` is the title. Separating those two is the single most important modelling decision in a library problem and it comes straight from the identity test.

`Money`, `LoanPeriod` and `DateRange` are value objects. "Weeks", "day" and "replacement cost" are not classes — they are attributes or units.

The verbs become methods, and their placement is the next question: `borrow` lives on the thing that knows whether it can be borrowed.

### Assign responsibility with CRC

For each candidate class write three things: its name, its responsibilities, and its collaborators. Keep responsibilities to three or four lines. If you cannot fit them, the class is doing too much — you have found a split before writing any code.

| Class | Responsibilities | Collaborators |
| --- | --- | --- |
| `Loan` | Knows its due date; reports whether it is overdue | `Copy`, `Member`, `Clock` |
| `LateFeePolicy` | Computes a fee from days overdue and a cap | `Money` |
| `Catalogue` | Finds titles by ISBN, author, title | `Book` |
| `Lending` | Borrows and returns; enforces borrow limits | `Loan`, `Copy`, `Members` |

This takes three minutes and produces a defensible class list. It is also easy to narrate, which matters more than it sounds.

### Find the aggregates

An **aggregate** is a cluster of objects treated as one unit for consistency. The root is the only member outsiders may reference.

Two questions identify one:

- **What must be consistent at the moment of a write?** An order's total must match its lines, so they commit together.
- **What can be eventually consistent?** A member's loan count and a global report can lag.

Consequences to state out loud, because they answer several later questions at once:

- One repository per aggregate root. No `OrderLineRepository`.
- Reference other aggregates by id, not by object reference.
- One transaction modifies one aggregate, where you can manage it.

### Placing behaviour: who knows enough to decide?

The recurring question is where a method goes. The rule that resolves most cases: **the method goes where the data it needs already lives.**

- `loan.isOverdue(now)` — the loan knows its due date. Yes.
- `member.canBorrow()` — needs the member's current loan count, which may be a query. Probably a service.
- `feePolicy.feeFor(daysLate)` — spans no entity and varies independently. A policy object.

If a method needs data from three entities, it belongs in a service that coordinates them — not shoved into whichever one you wrote first.""",
                    ),
                    (
                        "Example",
                        """A ride-hailing prompt, worked through the filters.

> "A rider requests a ride from a pickup to a destination. The system matches a nearby available driver. The rider is charged a fare based on distance and current surge."

Candidate nouns: rider, ride, pickup, destination, system, driver, fare, distance, surge.

| Candidate | Verdict | Why |
| --- | --- | --- |
| `Rider`, `Driver` | Entities | Identity matters, they have state |
| `Ride` | Entity, aggregate root | Has a lifecycle: Requested, Matched, InProgress, Completed, Cancelled |
| `Location` | Value object | Two identical coordinates are the same location |
| `Money`, `Distance` | Value objects | Immutable, compared by value |
| `SurgeMultiplier` | Value object | A number with rules, not an entity |
| "system" | Not a class | It is the whole program |
| `FarePolicy` | Policy | Spans entities, varies independently, injected |
| `DriverMatcher` | Service | Needs a spatial index; not behaviour of any one entity |

The aggregate is `Ride`. A `Ride` references `riderId` and `driverId` rather than holding the objects, because a driver's profile changing must not require loading or locking a ride.

And the highest-value observation: `Ride` has a lifecycle, so it is a state machine, and that is where the interesting rules live — you cannot start a ride that was cancelled, you cannot match a ride that is already matched.""",
                    ),
                    (
                        "Common Use Cases",
                        """- The first ten minutes of every low-level design interview
- Take-home exercises where a written model precedes the code
- Refactoring a legacy module, where you re-derive the model from what the code does
- Any conversation that starts "what tables do we need?" — the answer starts with aggregates""",
                    ),
                    (
                        "Trade-offs",
                        """- **Noun extraction over-generates.** It produces every incidental word; the filters are what make it useful.
- **Value objects add types.** More classes, and stronger compile-time guarantees. Worth it for anything that appears in three or more signatures.
- **Big aggregates are simple and contended.** One aggregate covering a whole level of a parking lot serialises everything. Small aggregates parallelise and push you toward eventual consistency between them.
- **Anaemic models are sometimes right.** A CRUD screen over a table does not need a rich domain, and saying so beats manufacturing behaviour that does not exist.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Turning every noun into a class, including "system" and "data"
- Manager, Helper, Util and Processor names, which mean cohesion was never established
- Missing the entity-versus-value distinction, so everything becomes a mutable class with an id
- One giant aggregate, which makes every write contend with every other
- Referencing other aggregates by object instead of by id, which drags half the graph into memory
- Putting behaviour in whichever class you wrote first rather than where the data lives""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"How did you choose these classes?"** Nouns from the requirements as candidates, filtered by identity, behaviour and lifecycle. Things with identity became entities, things compared by value became value objects, and behaviour spanning entities became policies or services.

**"Why is `Copy` separate from `Book`?"** Because identity differs. Two copies of the same title are distinct physical things that can be independently borrowed, lost or damaged. Merging them makes multiple copies impossible to model.

**"What is an aggregate and why does it matter?"** A consistency boundary with a single root. It decides what commits together, what a repository loads and saves, and therefore where transactions and locks belong.

**"Where do you put a method that needs data from three entities?"** In a service or policy that coordinates them. Forcing it onto one entity means that entity reaching into the other two, which is feature envy.""",
                    ),
                    (
                        "Interview Tip",
                        """Narrate the filter, not just the result. It shows the class list was derived rather than remembered.

> "From the requirements the candidate nouns are rider, ride, driver, location, fare and surge. Rider, driver and ride have identity so they are entities; location, money and surge are compared by value so they are immutable value objects. Ride has a lifecycle, so it is my aggregate root and I will draw its state machine before anything else. Fare calculation spans entities and is expected to change, so it becomes an injected `FarePolicy`."

Every class in that paragraph has a reason, which is exactly what the interviewer wanted to hear.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """Work this prompt through the filters:

> "A customer places an order containing several items. Each item has a quantity and a price. Orders over a threshold get free delivery. A customer can cancel an order before it ships, which refunds the payment."

1. List candidate nouns and classify each as entity, value object, policy, service or not-a-class.
2. Identify the aggregate root and say what it owns.
3. Which sentence in the prompt is a state machine?
4. Where does "orders over a threshold get free delivery" live, and why not on `Order`?""",
                    ),
                ],
                [
                    "Nouns are candidates; identity, behaviour and lifecycle decide which become classes.",
                    "Entities have identity and equality by id; value objects are immutable and compared by fields.",
                    "The aggregate root is the consistency boundary — one repository, one transaction, one lock.",
                    "Reference other aggregates by id so a write does not drag the graph into memory.",
                    "A method belongs where the data it needs already lives; spanning three entities means a service.",
                ],
                [
                    "How do you decide which classes a design needs?",
                    "What is an aggregate root and why does it matter?",
                    "Entity or value object — how do you tell?",
                    "Where do you put logic that spans several entities?",
                ],
            ),
            OD(
                "evolving-under-pressure",
                "Evolving a Design Under Pressure",
                "The follow-ups interviewers actually ask, and how a good design absorbs each one.",
                13,
                "The second half of an LLD interview is a sequence of changes: now make it thread-safe, now add a second pricing rule, now it runs on ten machines. These are not gotchas — they are the rubric. A design that absorbs them with a new class scores; one that needs surgery does not. This lesson is the catalogue of follow-ups and the move that answers each.",
                [
                    (
                        "Why It Matters",
                        """Interviewers have a small, stable set of follow-ups because they discriminate well. Each one probes a different design property:

- "Two users do this at once" → did you find the shared mutable state?
- "Add a second pricing rule" → is the varying part behind an interface?
- "How do you test this?" → are there seams?
- "It restarts — what is lost?" → did you separate state from storage?
- "Ten thousand items" → does anything scan a list that should be indexed?

You can prepare for all of them. More usefully, you can pre-empt several: a candidate who says "pricing is behind a `FeePolicy` because I expect rules to change" has already answered the extension follow-up before it arrives.

> Memory cue: every follow-up is asking whether one specific thing is a parameter, a seam, or a boundary.""",
                    ),
                    (
                        "Mental Model",
                        """The catalogue, with the move that answers each.

| Follow-up | What it tests | The move |
| --- | --- | --- |
| "Two threads do this at once" | Shared mutable state | Atomic data structure or per-key lock |
| "Add another pricing rule" | Open/closed | Strategy behind an interface |
| "Support a second notification channel" | Polymorphism | Interface plus registry |
| "How do you test this?" | Seams | Inject the clock, the store, the gateway |
| "What if it crashes mid-operation?" | Atomicity | Idempotency key, compensating action |
| "What survives a restart?" | State versus storage | Repository interface, rehydrate from a discriminator |
| "A hundred thousand entries" | Data structures | Index instead of scan; bound the memory |
| "Multiple machines" | Shared state | External store, distributed lock, or partition the keys |
| "Can we undo it?" | Command | Command objects with captured state |
| "Who is allowed to do this?" | Boundary | Authorisation at the edge, not in the domain |""",
                    ),
                    (
                        "How It Works",
                        """### "Now make it thread-safe"

Do not say `synchronized`. Do the analysis:

> "The shared mutable state is the free-spot set and the occupant of each spot. Tickets are immutable so they are fine. The race is check-then-act on a free spot, so I would hold free spots in a `BlockingQueue` per vehicle size — taking one is atomic, and two sizes never contend. The fee policy is stateless so it is shared safely."

Name the state, remove what does not need protecting, then choose the narrowest mechanism.

### "Now add weekend pricing"

If pricing is a strategy, this is one sentence and one class:

> "New `WeekendFeePolicy`, or better a `CompositeFeePolicy` that picks by day, and one line changes in the composition root. Nothing in `ParkingLot` changes."

If it is not, be honest and show the refactor:

> "Right now the fee arithmetic is inside `leave()`, so I would extract a `FeePolicy` interface first, move the current logic into `HourlyFeePolicy`, then add the weekend one. That is a five-minute refactor and it is the point at which I would introduce the abstraction — not before."

Doing the refactoring live scores better than having pre-built an abstraction you could not justify.

### "What if the process restarts?"

The question is whether your state has a storage boundary.

> "Active tickets are in a `ConcurrentHashMap`, so a restart loses them and cars cannot leave. I would put an `ActiveTickets` interface in the domain with the map as one implementation and a database as the other. The lot already depends on the interface, so nothing else changes. Spot occupancy would be rebuilt from the ticket store on startup."

### "Now it runs on three machines"

The in-process answers stop working, and knowing exactly which ones stop is the point.

> "The per-key lock only covers one JVM, so two machines could allocate the same spot. Three options: partition spots by machine so each owns a disjoint set and no coordination is needed; move allocation into the database with a conditional update on the spot row; or use a distributed lock, which I would avoid because it adds a dependency and a failure mode. I would take the conditional update — `UPDATE spots SET status='OCCUPIED' WHERE id=? AND status='FREE'` — and treat zero rows updated as 'someone beat me'."

### "There are a hundred thousand spots"

A data-structure question wearing a scale costume.

> "`findFreeSpot` currently scans a list, which is O(n) per arrival. I would keep a free-spot queue per size per level, so allocation is O(1). Memory is one reference per spot, which is fine. If I also need 'nearest to the entrance', the queue becomes a priority queue keyed by walking distance."

### The recovery lines

Two situations worth rehearsing.

**You realise your model is wrong.** Say it and fix it. "This ticket holding a `Spot` reference means I cannot persist it cleanly — let me hold a `SpotId` instead." Self-correction scores well; being corrected does not.

**You do not know a technology they name.** Never bluff. "I have not used Redisson's distributed locks in production. I know the general shape — a lease with a TTL and a fencing token to handle a holder that stalls. The property I need here is that a stalled holder cannot corrupt allocation, and a conditional database update gives me that without a new dependency." """,
                    ),
                    (
                        "Example",
                        """One design, four follow-ups, in the order they usually arrive.

**Base:** a `RateLimiter` with a `ConcurrentHashMap<RateKey, Bucket>` and a per-bucket lock.

**"Different limits per endpoint."**

> "The limit becomes part of the key rather than a constructor field: `RateKey` is client plus endpoint, and a `LimitPolicy` interface resolves a key to a limit. Adding a rule is a policy change, not a code change."

**"It must survive a restart."**

> "Buckets are in memory, so a restart resets everyone's allowance — which fails open, and for a limiter that is the safer direction. If we needed durability I would put the bucket behind a `BucketStore` interface with a Redis implementation, keeping the same `allow` contract."

**"Now four instances behind a load balancer."**

> "Each instance has its own buckets, so the effective limit is four times what we configured. Two answers: divide the limit by the instance count, which is simple and wrong during a deploy when the count changes; or move the bucket to Redis and do the refill-and-consume as a single Lua script so it is atomic. I would take the Redis script, and I would fail open if Redis is unreachable so the limiter cannot take down the API."

**"A million distinct keys."**

> "The map grows without bound, which is a memory leak. I would bound it with an LRU eviction and a TTL — an evicted key just starts with a full bucket, which again fails open. Worth stating that the failure direction is a deliberate choice, not an accident."

Notice the pattern in all four: name what breaks, give two options, pick one, and say what the choice costs.""",
                    ),
                    (
                        "Common Use Cases",
                        """- The last twenty minutes of every LLD interview
- Machine-coding rounds, where the follow-up is usually "now implement this extension"
- Design review at work, which is the same conversation with real consequences
- Deciding which abstractions to build up front and which to defer""",
                    ),
                    (
                        "Trade-offs",
                        """- **Pre-building extension points versus YAGNI.** Building every abstraction up front is speculative generality; building none means every follow-up is surgery. Build where you asked "what varies?" and got a yes.
- **Answering fast versus answering well.** A quick "I'd add a lock" is worse than thirty seconds of analysis producing the narrowest fix.
- **Refactoring live versus claiming you would have.** Doing the refactor is more convincing and costs minutes. Do it when the change is small.
- **Depth versus coverage.** If the interviewer keeps returning to one area, that is the rubric. Stay there.""",
                    ),
                    (
                        "Common Mistakes",
                        """- Answering "make it thread-safe" with `synchronized` and no analysis
- Claiming a design already handles a change when it plainly does not
- Rewriting instead of extending when a small refactor would do
- Adding a distributed lock as a reflex for any multi-machine question
- Ignoring the failure direction — failing open versus closed is a decision to state
- Bluffing about a technology rather than reasoning about the property you need""",
                    ),
                    (
                        "Interviewer Follow-up Questions",
                        """**"How would you add feature X?"** Name the extension point it lands on. If one exists, the answer is a new class and a wiring line. If not, say which small refactor creates it and then do that refactor.

**"What breaks when you run two instances?"** Everything relying on in-process state: locks, caches, counters, id generators. The fix is to partition the keys, move the state to a shared store, or make the operation conditional so a loser detects the conflict.

**"What happens if it crashes halfway?"** Depends whether the operation is idempotent. With an idempotency key a retry is safe; without one, the outcome is unknown and needs reconciliation or a compensating action.

**"What is the weakest part of your design?"** Always have an answer. Volunteering it reads as senior; having it found for you does not.""",
                    ),
                    (
                        "Interview Tip",
                        """Answer every follow-up in the same four beats: what breaks, two options, your pick, what it costs.

> "With four instances each keeps its own buckets, so the effective limit is four times what we set. I could divide the limit by instance count — simple, but wrong whenever the count changes during a deploy — or move the bucket into Redis with refill and consume in one atomic script. I would take Redis, and fail open when it is unreachable so the limiter can never take down the API itself."

Four beats, twenty seconds, and it demonstrates analysis, alternatives, a decision and its cost.""",
                    ),
                    (
                        "Mini Design Exercise",
                        """You have designed an in-memory LRU cache with a `HashMap` and a doubly linked list. Answer these four follow-ups in the four-beat format:

1. Two threads `get` and `put` the same key simultaneously.
2. Entries must expire after a TTL as well as on eviction.
3. The cache runs on six machines and they should share entries.
4. One key is requested ten thousand times a second and is not in the cache.

Question four is the cache stampede. If your answer does not include collapsing the duplicate loads, it is incomplete.""",
                    ),
                ],
                [
                    "Every follow-up asks whether one thing is a parameter, a seam or a boundary.",
                    "Answer in four beats: what breaks, two options, your pick, what it costs.",
                    "Refactoring live to create an extension point beats pre-building one you cannot justify.",
                    "In-process locks, caches and counters are exactly what breaks on a second instance.",
                    "State the failure direction — failing open or closed is a decision, not an accident.",
                ],
                [
                    "How would you add this new requirement to your design?",
                    "What breaks when this runs on more than one machine?",
                    "What happens if the process crashes halfway through?",
                    "What is the weakest part of your design?",
                ],
            ),
        ],
    )


# ---------------------------------------------------------------------------
# Module 8 — Case studies
# ---------------------------------------------------------------------------


def _case(
    slug: str,
    title: str,
    short: str,
    description: str,
    difficulty: str,
    order: int,
    minutes: int,
    lead: str,
    sections: list[Section],
    takeaways: list[str],
    questions: list[str],
) -> dict:
    """One case study: a single long lesson inside its own topic."""
    return _ood_topic(
        slug,
        title,
        description,
        difficulty,
        order,
        [OD(slug, title, short, minutes, lead, sections, takeaways, questions)],
    )


def _parking_lot_topic() -> dict:
    return _case(
        "parking-lot",
        "Practice: Parking Lot",
        "The canonical LLD warm-up, worked end to end with the follow-ups that always arrive.",
        "Spots, vehicles, tickets and fees — the most-asked LLD problem, designed properly and then stressed.",
        "MEDIUM",
        20,
        16,
        "Parking lot is the interview equivalent of FizzBuzz for object-oriented design: everyone has seen it, which means a mediocre answer is very visible. The problem rewards three things — separating allocation from pricing, finding the state machine, and having a real answer when two cars arrive at once.",
        [
            (
                "Why It Matters",
                """This problem is asked because it has a clean domain and four independent dimensions to probe: modelling, extension, concurrency and scale. It also has a well-known wrong answer — one `ParkingLot` class containing spot allocation, fee arithmetic, ticket issuing and payment — which makes it easy for an interviewer to tell whether you separate responsibilities under time pressure.

The highest-value insight is that **allocation and pricing are independent and both will change.** Allocation changes when a new vehicle type or a "nearest to the lift" rule appears; pricing changes every time marketing has an idea. If they live in the same class, every marketing request risks breaking parking.""",
            ),
            (
                "Requirements & Scope",
                """State these in the first two minutes and get agreement.

**Functional**

- Park a vehicle: find a suitable free spot, issue a ticket.
- Leave: compute a fee from the stay duration, free the spot, issue a receipt.
- Query availability by vehicle size.

**Out of scope** (say so explicitly): reservations, number-plate recognition, payment processing beyond computing the amount, multi-site management.

**Assumptions worth stating**

- A spot fits vehicles of its own size or smaller.
- Multi-level, with spots partitioned by level and size.
- Single process for the first design; the interviewer will change this.
- Fee rules will change — this is the question to ask, and the answer drives the design.""",
            ),
            (
                "How It Works",
                """### The classes

```java
public enum VehicleSize { MOTORCYCLE, CAR, LARGE }

public record Vehicle(String plate, VehicleSize size) {}
public record SpotId(int level, int number) {}

public final class Spot {
    private final SpotId id;
    private final VehicleSize size;
    private SpotState state = SpotState.FREE;      // FREE, OCCUPIED, OUT_OF_SERVICE

    boolean fits(VehicleSize vehicle) { return size.ordinal() >= vehicle.ordinal(); }
}

public record Ticket(TicketId id, SpotId spotId, VehicleSize size, Instant issuedAt) {}
public record Receipt(TicketId ticketId, Duration stay, Money fee) {}
```

`Ticket` holds a `SpotId`, not a `Spot`. That single choice makes tickets immutable, persistable and safe to hand out — and it is a good thing to justify out loud.

### The two policies

```java
public interface SpotAllocator {
    Optional<Spot> allocate(VehicleSize size);
    void release(SpotId spotId);
}

public interface FeePolicy {
    Money feeFor(VehicleSize size, Duration stay);
}
```

Everything that will change is now behind one of these. Nearest-to-entrance allocation is a new `SpotAllocator`; weekend pricing is a new `FeePolicy`.

### The lot orchestrates and decides nothing

```java
public final class ParkingLot {
    private final SpotAllocator allocator;
    private final FeePolicy feePolicy;
    private final ActiveTickets activeTickets;      // interface: map now, database later
    private final Clock clock;

    public Ticket park(Vehicle vehicle) {
        Spot spot = allocator.allocate(vehicle.size())
            .orElseThrow(() -> new LotFull(vehicle.size()));
        Ticket ticket = new Ticket(TicketId.random(), spot.id(), vehicle.size(), clock.instant());
        activeTickets.put(ticket);
        return ticket;
    }

    public Receipt leave(TicketId ticketId) {
        Ticket ticket = activeTickets.remove(ticketId)
            .orElseThrow(() -> new UnknownTicket(ticketId));
        Duration stay = Duration.between(ticket.issuedAt(), clock.instant());
        Money fee = feePolicy.feeFor(ticket.size(), stay);
        allocator.release(ticket.spotId());
        return new Receipt(ticketId, stay, fee);
    }
}
```

Three methods, no arithmetic, no allocation strategy. Every line is a delegation or a control-flow decision.

### Composable pricing

```java
public final class HourlyFeePolicy implements FeePolicy {
    public Money feeFor(VehicleSize size, Duration stay) {
        long hours = Math.max(1, (long) Math.ceil(stay.toMinutes() / 60.0));
        return ratePerHour.get(size).times(hours);
    }
}

public final class CappedFeePolicy implements FeePolicy {
    private final FeePolicy delegate;
    private final Money dailyCap;

    public Money feeFor(VehicleSize size, Duration stay) {
        Money raw = delegate.feeFor(size, stay);
        Money cap = dailyCap.times(Math.max(1, stay.toDays()));
        return raw.isGreaterThan(cap) ? cap : raw;
    }
}
```

A daily maximum becomes a wrapper rather than an `if`. This composability is worth demonstrating — it is the difference between a design that absorbs changes and one that accumulates branches.""",
            ),
            (
                "Example",
                """Walk one park-and-leave out loud, then the failure.

**Happy path.** `park(new Vehicle("AB-12", CAR))` asks the allocator for a spot that fits a car. The allocator returns spot (2, 17). A ticket is created with that spot id and the current instant from the injected clock, stored in `activeTickets`, and returned. Nothing else is mutated.

**Leaving.** `leave(ticketId)` removes the ticket atomically — remove, not get-then-remove, so a double exit cannot charge twice. The stay is computed from the injected clock, the fee policy prices it, the allocator frees the spot, and a receipt is returned.

**Failure.** No spot fits: the allocator returns empty and `park` throws `LotFull` before anything is mutated, so there is no partial state to clean up. Unknown ticket: `leave` throws before releasing any spot.

Say that last sentence explicitly. "Nothing is mutated before the failure point" is the cheapest way to show you think about partial failure.""",
            ),
            (
                "Trade-offs",
                """- **Spot state in `Spot` versus in the allocator.** Keeping it in the allocator makes atomic allocation easy and means `Spot` is nearly a value object; keeping it in `Spot` is more natural to read and harder to make atomic. Choose and justify.
- **Ticket holds `SpotId` not `Spot`.** Immutable and persistable, at the cost of a lookup when you need the spot.
- **Fee computed on exit versus accrued.** On exit is simpler; accrual supports showing a running total on a display at the cost of a scheduled job.
- **One allocator versus one per level.** Per level parallelises and complicates "find the nearest free spot anywhere".""",
            ),
            (
                "Common Mistakes",
                """- One `ParkingLot` class holding allocation, pricing, tickets and payment
- Fee arithmetic inline in `leave()`, so any pricing change edits the parking path
- `Ticket` holding a live `Spot` reference, making it mutable and hard to persist
- Scanning all spots on every arrival instead of keeping free spots indexed by size
- Calling `Instant.now()` inside the lot, which makes the fee logic untestable
- Ignoring the double-exit case, so one ticket can be used twice""",
            ),
            (
                "Evolution Under Pressure",
                """**"Two cars arrive at the same time."** The race is check-then-act inside the allocator. Hold free spots in a `BlockingQueue<Spot>` per size per level so `poll()` is atomic; two sizes never contend and no lock is needed on the lot at all.

**"Electric vehicles need charging spots."** A spot gains a capability set rather than a new size, and allocation takes a requirement: `allocate(size, Set.of(CHARGING))`. Modelling it as a fourth size is the wrong answer — a charging spot is still a car spot.

**"Weekend and holiday pricing."** A new `FeePolicy` selected by day, or a composite that delegates. Nothing in `ParkingLot` changes.

**"Ten thousand spots."** The free-spot queues are already O(1) per allocation. If "nearest to the lift" is required, each queue becomes a priority queue keyed by walking distance, which is O(log n) and still fine.

**"The process restarts."** Active tickets are behind an interface, so swap the in-memory map for a repository; rebuild spot occupancy from the ticket store on startup. Cars cannot leave otherwise, which is the user-visible consequence to name.

**"Three entrances, three machines."** Per-JVM queues no longer coordinate. Either partition spots by entrance so each machine owns a disjoint set, or make allocation a conditional update — `UPDATE spots SET status='OCCUPIED' WHERE id=? AND status='FREE'` — and treat zero rows as losing the race.""",
            ),
            (
                "Interviewer Follow-up Questions",
                """**"How do you find a free spot efficiently?"** A queue or priority queue of free spots per size per level. O(1) allocation, O(1) release, and no scanning.

**"How do you prevent two cars getting the same spot?"** Make the take atomic: `BlockingQueue.poll()` in one process, or a conditional database update across processes. A lock around the whole lot works and serialises everything.

**"Where does the fee calculation live?"** In a `FeePolicy` injected into the lot, because pricing changes on a different schedule from parking and I want to add rules without touching allocation.

**"What happens to a lost ticket?"** A business rule, not a technical one: charge a maximum daily rate. It lives in the fee policy, keyed off a ticket state, which is why the ticket has a lifecycle worth modelling.

**"Can the same ticket be used twice?"** No — `leave` removes atomically and throws on a second attempt. Get-then-remove would allow a double charge under concurrency.""",
            ),
            (
                "Interview Tip",
                """Open by naming the two axes of change. It structures the whole answer and pre-empts the extension follow-up.

> "Two things here will change independently: how a spot is chosen and how the stay is priced. So `SpotAllocator` and `FeePolicy` are interfaces from the start, and `ParkingLot` only sequences them. That way nearest-to-lift allocation and weekend pricing are each one new class, and neither can break the other."

You have justified two abstractions with evidence rather than asserting that the design is extensible.""",
            ),
        ],
        [
            "Separate allocation from pricing — they change independently and both will.",
            "Keep free spots indexed by size so allocation is O(1) and atomic.",
            "Tickets hold a SpotId, which keeps them immutable and persistable.",
            "The concurrency answer is an atomic take, not a lock around the whole lot.",
            "Fail before mutating, so there is no partial state to unwind.",
        ],
        [
            "How do you allocate a spot efficiently and atomically?",
            "Where does fee calculation belong, and why not in the lot?",
            "How would you support electric charging spots?",
            "What survives a restart, and what does the user experience if nothing does?",
        ],
    )


def _vending_machine_topic() -> dict:
    return _case(
        "vending-machine",
        "Practice: Vending Machine",
        "The classic state-machine LLD, with inventory, money handling and change-making.",
        "States, inventory and cash — the problem that exists to see whether you recognise a state machine.",
        "MEDIUM",
        21,
        15,
        "The vending machine is asked for one reason: it is a state machine wearing a product costume, and the interviewer wants to see whether you notice. Candidates who reach for boolean flags produce a tangle within ten minutes. Candidates who draw the transition table first finish comfortably and have time for the interesting parts — change-making and concurrent access.",
        [
            (
                "Why It Matters",
                """Every operation's legality depends on what happened before. Selecting a product is valid only with sufficient credit. Inserting a coin is valid in most states but not mid-dispense. Refunding is a no-op when nothing has been inserted.

Expressed with booleans, that is a growing set of conditions repeated in every method. Expressed as states, each state simply implements what it permits. The problem is small enough that the difference between the two approaches is visible within the interview, which is exactly why it is asked.

The second thing being tested is money. Change-making is a real algorithm, and the greedy approach is wrong for some denomination sets — knowing that distinction separates answers.""",
            ),
            (
                "Requirements & Scope",
                """**Functional**

- Insert coins one at a time; credit accumulates.
- Select a product by slot code.
- Dispense when credit covers the price and stock exists; return change.
- Refund at any point before dispensing.
- Restock and collect cash (a service operation).

**Out of scope:** card payments, remote telemetry, multi-machine fleet management.

**Assumptions to state**

- Coins are a fixed, known set of denominations.
- The machine may run out of change, and that must be handled rather than ignored.
- Single-user physically, but the software may be called concurrently by a service door and a customer interface.""",
            ),
            (
                "How It Works",
                """### The transition table comes first

Draw this before any class.

| State | insertCoin | select | refund | dispenseComplete |
| --- | --- | --- | --- | --- |
| **Idle** | → HasCredit | error: no credit | no-op | — |
| **HasCredit** | → HasCredit | → Dispensing or stay | → Idle, return coins | — |
| **Dispensing** | reject coin | reject | reject | → Idle |
| **OutOfService** | reject | reject | → Idle, return coins | — |

Agreeing this table with the interviewer takes ninety seconds and makes every later decision obvious.

### States as classes

```java
public interface MachineState {
    MachineState insertCoin(VendingMachine m, Coin coin);
    MachineState select(VendingMachine m, SlotCode slot);
    MachineState refund(VendingMachine m);
}

public final class Idle implements MachineState {
    public MachineState insertCoin(VendingMachine m, Coin coin) {
        m.acceptCoin(coin);
        return new HasCredit();
    }
    public MachineState select(VendingMachine m, SlotCode slot) { throw new NoCreditInserted(); }
    public MachineState refund(VendingMachine m) { return this; }
}

public final class HasCredit implements MachineState {
    public MachineState insertCoin(VendingMachine m, Coin coin) {
        m.acceptCoin(coin);
        return this;
    }

    public MachineState select(VendingMachine m, SlotCode slot) {
        Product product = m.inventory().peek(slot).orElseThrow(() -> new SoldOut(slot));
        if (m.credit().isLessThan(product.price())) return this;          // wait for more coins
        Money change = m.credit().minus(product.price());
        List<Coin> coins = m.cashBox().makeChange(change)
            .orElseThrow(() -> new ExactChangeRequired(change));          // checked BEFORE dispensing
        m.inventory().take(slot);
        m.dispense(product);
        m.returnCoins(coins);
        m.clearCredit();
        return new Idle();
    }

    public MachineState refund(VendingMachine m) {
        m.returnCoins(m.cashBox().refund(m.credit()));
        m.clearCredit();
        return new Idle();
    }
}
```

The critical ordering: **make change before dispensing.** Dispensing first and then discovering you cannot make change leaves the customer short and the machine in an inconsistent state. This is the detail interviewers watch for.

### Three separate concerns

```java
public interface Inventory {
    Optional<Product> peek(SlotCode slot);
    void take(SlotCode slot);
    void restock(SlotCode slot, Product product, int count);
}

public interface CashBox {
    void accept(Coin coin);
    Optional<List<Coin>> makeChange(Money amount);
    List<Coin> refund(Money amount);
}
```

Inventory, cash and state are independent. Merging them is the most common design failure here — the machine's cash position has nothing to do with how many chocolate bars are in slot A1.

### Change-making is not always greedy

With coins 1, 5, 10, 25 the greedy approach — take the largest that fits, repeat — is optimal. With a set like 1, 3, 4, making 6 greedily gives 4+1+1 (three coins) when 3+3 (two coins) is better.

The correct general answer is a small dynamic program over the amount, bounded by the coins actually in the box. Say both: "greedy works for standard denominations; I would implement the DP because it is fifteen lines and cannot be wrong, and it naturally handles running out of a denomination." """,
            ),
            (
                "Example",
                """A full interaction, narrated.

Machine is `Idle`. Customer inserts 25 cents: `Idle.insertCoin` accepts the coin into the cash box, credit becomes 25, state becomes `HasCredit`. Another 25: credit 50, state unchanged. Another 25: credit 75.

Customer selects A1, price 60. `HasCredit.select` peeks inventory — in stock. Credit 75 covers 60. Change required is 15. The cash box tries to make 15 from its holdings: a 10 and a 5, available. Only now does it take the item from inventory, dispense, return the two coins, clear credit, and transition to `Idle`.

Now the failure. Same purchase, but the box holds only quarters. `makeChange(15)` returns empty, `ExactChangeRequired` is thrown, and **nothing has been mutated** — the item is still in stock, the credit is still 75, and the state is still `HasCredit`. The customer can refund or add exact change.

That ordering is the whole lesson of this problem, and narrating it explicitly is what a strong answer looks like.""",
            ),
            (
                "Trade-offs",
                """- **State classes versus an enum.** Classes suit behaviour-rich states; an enum with per-constant methods puts the whole machine on one screen. For four states either is defensible — say which and why.
- **Credit in the machine versus in the state.** In the machine is simpler and means states are stateless and shareable. In the state is purer and means every transition copies.
- **Greedy versus DP change-making.** Greedy is three lines and wrong for unusual denominations; DP is fifteen lines and always right. Prefer DP and say why.
- **Reserving stock at selection.** Reserving before payment prevents a sold-out surprise and needs a release path if the customer refunds.""",
            ),
            (
                "Common Mistakes",
                """- Boolean flags instead of an explicit state, then re-deriving legality in every method
- Dispensing before confirming change can be made
- Mixing inventory and cash into one class
- Greedy change-making presented as universally correct
- Ignoring the exact-change-only mode when the box is low
- Forgetting that a refund must return the actual coins inserted, or an equivalent the box can afford""",
            ),
            (
                "Evolution Under Pressure",
                """**"The machine runs out of change."** Enter an exact-change-only mode: `makeChange` failing is not an error state but a machine condition. Display it, and reject selections that would need change before taking more coins.

**"Add card payments."** Payment becomes a strategy: `PaymentMethod` with coin and card implementations. The state machine gains an `AwaitingAuthorisation` state because a card call is slow and can fail — which is a genuinely new state, not a flag.

**"Two threads: a customer and the service door."** The shared mutable state is credit, inventory and the cash box. Restocking during a dispense must not corrupt counts. A single lock on the machine is defensible here because the physical device is inherently serial — and saying *why* coarse locking is right is better than reflexively going fine-grained.

**"Track sales for reporting."** Publish a `ProductDispensed` event rather than adding reporting to the machine. Analytics must never be able to fail a sale.

**"The power fails mid-dispense."** State must be recoverable. Persist the current state and credit on each transition, and on startup decide the policy for a machine found in `Dispensing` — most real machines refund.""",
            ),
            (
                "Interviewer Follow-up Questions",
                """**"What states does the machine have?"** Idle, HasCredit, Dispensing and OutOfService, with the transitions I drew. I would model them as classes so an illegal operation cannot be expressed rather than merely checked.

**"How do you make change?"** A dynamic program over the target amount bounded by the coins actually held. Greedy is optimal for standard denominations and not in general, and the DP also handles running out of one denomination.

**"What if you cannot make change?"** Detect it before dispensing, throw, and leave the transaction untouched so the customer can refund or insert exact change.

**"Where does the price live?"** On the product in the inventory slot, not in the machine, so restocking a slot with a different item changes the price with it.

**"Is this thread-safe?"** The machine holds shared mutable credit, inventory and cash. Given the device is physically serial, one lock on the machine is the right granularity here — this is the case where coarse locking is correct.""",
            ),
            (
                "Interview Tip",
                """Announce the state machine before writing anything, and state the dispense ordering rule unprompted.

> "This is a state machine, so let me agree the states and transitions first: Idle, HasCredit, Dispensing, OutOfService. One rule I want to get right early — change must be confirmed available before the product is dispensed, otherwise a machine low on coins takes the customer's money and short-changes them."

You have named the pattern and demonstrated that you think about failure ordering, which is most of this problem.""",
            ),
        ],
        [
            "Draw the transition table before writing any class.",
            "Confirm change is available before dispensing, never after.",
            "Inventory, cash and state are three separate concerns.",
            "Greedy change-making is only optimal for well-behaved denomination sets.",
            "A physically serial device is the case where one coarse lock is the right answer.",
        ],
        [
            "What are the states and legal transitions?",
            "How do you compute change, and when is greedy wrong?",
            "What happens when the machine cannot make change?",
            "How would you add card payment to this design?",
        ],
    )


def _elevator_topic() -> dict:
    return _case(
        "elevator",
        "Practice: Elevator System",
        "Requests, scheduling and a car — the LLD problem that is really a scheduling problem.",
        "Cars, requests and dispatch policy, including what happens when one building has six elevators.",
        "HARD",
        22,
        16,
        "Elevator design looks like modelling and is really about scheduling. The classes are easy; the interesting questions are which car answers a hall call, how a car orders the floors it has committed to, and how you stop a request being starved. Separating the car from the dispatcher is the move that makes all three answerable.",
        [
            (
                "Why It Matters",
                """Two things make this problem discriminating.

First, **there are two kinds of request and candidates routinely conflate them.** A hall call — someone pressing up or down on floor 7 — has a direction and no destination, and any car may serve it. A car call — someone inside pressing 12 — belongs to one specific car. Designs that treat them as one type cannot express "a car going up may pick up an up-call on the way".

Second, the scheduling policy is where the depth is. Anyone can write "go to the nearest floor". A strong answer names a real algorithm, explains why naive nearest-first starves people, and separates the policy from the car so it can be changed.""",
            ),
            (
                "Requirements & Scope",
                """**Functional**

- A rider presses up or down on a floor (hall call).
- A rider inside a car selects a destination floor (car call).
- Cars move, open doors at committed floors, and continue.
- The system chooses which car serves each hall call.

**Out of scope:** door sensors, weight limits, fire-service mode, physical motor control — unless the interviewer asks, at which point fire mode is a state.

**Assumptions**

- N cars, M floors, one building.
- Cars cannot change direction with committed stops ahead in the current direction.
- Requests must eventually be served — no starvation. Say this out loud; it constrains the algorithm.""",
            ),
            (
                "How It Works",
                """### Two request types, not one

```java
public enum Direction { UP, DOWN, IDLE }

public record HallCall(int floor, Direction direction, Instant requestedAt) {}
public record CarCall(int floor) {}
```

The timestamp on a hall call is what makes anti-starvation possible later. Including it up front is cheap and shows foresight.

### The car knows how to move, not where to go

```java
public final class ElevatorCar {
    private final CarId id;
    private int currentFloor;
    private Direction direction = Direction.IDLE;
    private final NavigableSet<Integer> stopsAbove = new TreeSet<>();
    private final NavigableSet<Integer> stopsBelow = new TreeSet<>(Comparator.reverseOrder());

    public void commit(int floor) {
        if (floor > currentFloor) stopsAbove.add(floor);
        else if (floor < currentFloor) stopsBelow.add(floor);
        else openDoors();
    }

    public void step() {                       // one simulation tick
        Integer next = nextStop();
        if (next == null) { direction = Direction.IDLE; return; }
        currentFloor += Integer.signum(next - currentFloor);
        if (currentFloor == next) {
            removeStop(next);
            openDoors();
        }
    }

    private Integer nextStop() {
        if (direction == Direction.UP)   return stopsAbove.isEmpty() ? stopsBelow.pollFirst() : stopsAbove.first();
        if (direction == Direction.DOWN) return stopsBelow.isEmpty() ? stopsAbove.pollFirst() : stopsBelow.first();
        return stopsAbove.isEmpty() ? (stopsBelow.isEmpty() ? null : stopsBelow.first()) : stopsAbove.first();
    }
}
```

Two sorted sets — stops above and stops below — are what implement the elevator algorithm naturally: serve everything in the current direction in order, then reverse. That is LOOK, and it is what real elevators do.

### The dispatcher chooses the car

```java
public interface DispatchPolicy {
    Optional<CarId> chooseCar(HallCall call, List<CarSnapshot> cars);
}

public final class ElevatorController {
    private final List<ElevatorCar> cars;
    private final DispatchPolicy policy;
    private final Queue<HallCall> unassigned = new ArrayDeque<>();

    public void requestHall(HallCall call) {
        policy.chooseCar(call, snapshot())
            .ifPresentOrElse(
                carId -> carFor(carId).commit(call.floor()),
                () -> unassigned.add(call));           // retry next tick
    }
}
```

Separating `DispatchPolicy` is the single most important structural decision. Nearest-car, least-load, zoned and energy-efficient are then all interchangeable, and the interviewer's "what if the policy changes?" is a one-line answer.

### Why nearest-car alone is wrong

Nearest-car is a greedy heuristic with a known failure: in a busy building, a car near the lobby keeps being chosen and a call on floor 20 waits indefinitely.

Two mitigations worth naming:

- **Score, do not just measure distance.** Combine distance, current direction agreement, number of committed stops, and — critically — how long the call has already waited.
- **Escalate aged calls.** A hall call older than a threshold gets priority weight so it eventually wins regardless of distance.

```java
public final class ScoringDispatch implements DispatchPolicy {
    public Optional<CarId> chooseCar(HallCall call, List<CarSnapshot> cars) {
        return cars.stream()
            .filter(car -> car.canServe(call))
            .min(Comparator.comparingDouble(car -> cost(car, call)))
            .map(CarSnapshot::id);
    }

    private double cost(CarSnapshot car, HallCall call) {
        double distance = Math.abs(car.floor() - call.floor());
        double wrongWay = car.direction() == Direction.IDLE ? 0
                        : car.direction() == call.direction() ? 0 : 10;
        double load = car.committedStops() * 2;
        double aging = waitedSeconds(call) * 0.5;          // starvation guard
        return distance + wrongWay + load - aging;
    }
}
```

Showing the aging term unprompted is the detail that distinguishes this answer.""",
            ),
            (
                "Example",
                """A concrete trace, which is the fastest way to show the design works.

Three cars: A idle on 1, B going up at 4 with a committed stop at 9, C going down at 12.

A hall call arrives: floor 6, UP.

- **A** is idle, distance 5, no direction penalty, no load → score 5.
- **B** is at 4 heading up, will pass 6 before 9, distance 2, direction agrees, one committed stop → score 2 + 0 + 2 = 4.
- **C** is heading down and would have to reverse → direction penalty 10, distance 6 → score 16+.

B wins, which is correct: it is already going that way and picks the rider up en route. `B.commit(6)` inserts 6 into `stopsAbove`, and because the set is sorted, B serves 6 then 9 without any extra logic.

Now the starvation case. A call on floor 20 has waited 40 seconds while lobby traffic keeps winning. The aging term contributes -20 to its score, which is enough to beat a car two floors away. That is the anti-starvation guarantee, expressed as arithmetic rather than as a promise.""",
            ),
            (
                "Trade-offs",
                """- **Per-car queues versus one global queue.** Per-car allows a natural LOOK sweep and commits early; a global queue allows reassignment when conditions change, at the cost of complexity.
- **Assign immediately versus defer.** Immediate assignment gives riders a car number straight away, which many buildings display; deferring until the last moment produces better allocation but no early feedback.
- **Simple nearest-car versus scoring.** Nearest is two lines and starves; scoring needs tuning and is what real systems use.
- **Simulation tick versus event-driven.** A tick is easy to test deterministically; event-driven is more realistic and harder to reason about in an interview.""",
            ),
            (
                "Common Mistakes",
                """- One request type, which makes "pick up on the way" impossible to express
- Scheduling logic inside `ElevatorCar`, so the policy cannot be changed or tested alone
- Nearest-car with no aging term, which starves distant floors under load
- An unsorted list of stops, requiring a scan to find the next one
- Letting a car reverse direction with committed stops still ahead of it
- Calling real time inside the car instead of stepping a simulation clock, making tests slow and flaky""",
            ),
            (
                "Evolution Under Pressure",
                """**"Six elevators in one building."** The dispatcher already handles N cars. The realistic addition is zoning — cars 1 to 3 serve floors 1 to 20, 4 to 6 serve 21 to 40 — implemented as a `ZonedDispatch` policy, with express cars for peak periods.

**"Morning rush: everyone goes up from the lobby."** A different policy, not different classes. `UpPeakDispatch` parks idle cars at the lobby and biases assignment toward up-calls. Peak detection is a strategy selection, which is why the policy interface matters.

**"A car breaks down."** `OutOfService` is a car state. Its committed stops are returned to the unassigned queue and re-dispatched. Riders inside get a separate, urgent path.

**"Fire alarm."** A system-wide mode where all cars return to the ground floor and stop accepting calls. This is a state on the controller, and it must override every policy.

**"Thread safety."** Each car has its own committed-stop sets, so per-car locks suffice; the dispatcher reads snapshots rather than live cars, which avoids holding a lock while scoring. Saying "I score against immutable snapshots" is a precise concurrency answer.

**"How do you test this?"** Inject a stepped clock and drive the simulation tick by tick. Assert that a specific hall call is served within N ticks and that no call waits longer than the starvation bound. That second assertion is the one worth naming.""",
            ),
            (
                "Interviewer Follow-up Questions",
                """**"How do you decide which car answers a call?"** A `DispatchPolicy` that scores each eligible car on distance, direction agreement, current load and how long the call has waited. The aging term is what prevents starvation.

**"Why not just pick the nearest car?"** Because it starves. Under sustained lobby traffic a distant floor never wins, and the rider waits indefinitely. Distance has to be one term among several.

**"How does one car order its stops?"** Two sorted sets, above and below the current floor. Serve everything in the current direction in order, then reverse — that is the LOOK algorithm and it falls out of the data structure.

**"What if a car is full?"** It stops being eligible for new hall calls but still serves its committed car calls. Capacity becomes a filter in the policy rather than a special case in the car.

**"How would you test the scheduler?"** Deterministic simulation on a stepped clock, asserting both that every call is eventually served and that the maximum wait stays under a bound.""",
            ),
            (
                "Interview Tip",
                """Separate the car from the dispatcher in your first sentence, and name the starvation problem before you are asked.

> "I want two pieces: `ElevatorCar`, which knows how to move and which floors it has committed to, and a `DispatchPolicy`, which decides which car takes a hall call. Keeping them apart means I can swap nearest-car for a scoring policy without touching the car. And I will put an aging term in the score from the start, because pure nearest-car starves high floors during lobby rush."

You have named the separation, the extension point, and a real failure mode of the obvious answer.""",
            ),
        ],
        [
            "Hall calls and car calls are different types; conflating them breaks en-route pickup.",
            "The car owns movement; a DispatchPolicy owns which car serves a call.",
            "Two sorted sets of stops give you the LOOK algorithm for free.",
            "Nearest-car starves distant floors — score with an aging term instead.",
            "Score against immutable car snapshots so dispatch never holds a car's lock.",
        ],
        [
            "How do you choose which elevator answers a hall call?",
            "Why is nearest-car insufficient?",
            "How does a single car order the floors it must visit?",
            "How would you test the scheduling policy deterministically?",
        ],
    )


def _library_topic() -> dict:
    return _case(
        "library",
        "Practice: Library Management",
        "A data-model-heavy LLD where the key insight is separating a title from a physical copy.",
        "Catalogue, copies, members and loans — the modelling problem that punishes a careless entity split.",
        "MEDIUM",
        23,
        14,
        "The library problem is about modelling, not algorithms. It has one central insight — a book title and a physical copy are different entities — and a cluster of realistic rules around loans, holds and fees. Candidates who miss the title/copy split spend the rest of the interview working around it.",
        [
            (
                "Why It Matters",
                """Run the identity test on \"book\". Are two copies of *Dune* the same thing? For searching the catalogue, yes — they share an ISBN, author and title. For borrowing, no — one is on loan and the other is on the shelf, and they can be independently lost or damaged.

That means two entities: `Book` (the title) and `BookCopy` (the physical item). Missing this makes multiple copies impossible to represent, and every later requirement — holds, availability, per-copy condition — becomes a workaround.

The second thing this problem tests is where rules live. "A member may borrow at most five items" needs the member's current loan count, which is a query. Putting it on `Member` forces the entity to reach into a repository; putting it in a lending service keeps the entity clean. That is a genuine design decision and interviewers probe it.""",
            ),
            (
                "Requirements & Scope",
                """**Functional**

- Search the catalogue by ISBN, title or author.
- Borrow an available copy; refuse if the member is at their limit or has unpaid fees.
- Return a copy; charge a late fee if overdue.
- Place a hold on a title with no available copies; notify when one is returned.

**Out of scope:** acquisitions, inter-library transfer, payments beyond computing a fee.

**Assumptions**

- Loan period is fixed per item type and will change — so it is a policy.
- Late fees accrue per day with a cap at replacement cost.
- One branch initially; the interviewer will add more.""",
            ),
            (
                "How It Works",
                """### The entity split

```java
public record Isbn(String value) {}

public final class Book {                    // the title - one per ISBN
    private final Isbn isbn;
    private final String title;
    private final List<String> authors;
    private final Money replacementCost;
}

public final class BookCopy {                // the physical item - many per title
    private final CopyId id;
    private final Isbn isbn;
    private final BranchId branch;
    private CopyStatus status;               // AVAILABLE, ON_LOAN, LOST, DAMAGED
}
```

Everything downstream depends on this. `Catalogue` searches `Book`; `Lending` moves `BookCopy`.

### Loans as first-class objects

```java
public final class Loan {
    private final LoanId id;
    private final CopyId copyId;
    private final MemberId memberId;
    private final LocalDate borrowedOn;
    private final LocalDate dueOn;
    private LocalDate returnedOn;            // null while active

    public boolean isOverdue(LocalDate today) {
        return returnedOn == null && today.isAfter(dueOn);
    }

    public long daysOverdue(LocalDate today) {
        LocalDate end = returnedOn != null ? returnedOn : today;
        return Math.max(0, ChronoUnit.DAYS.between(dueOn, end));
    }
}
```

A loan is an entity with a lifecycle, not a field on a copy. That makes history queryable — "who had this copy in March?" — which a status flag cannot answer.

Note that `daysOverdue` works for both an active and a returned loan. Small detail, and it is the kind of thing that breaks when you write it carelessly.

### Policies for the things that change

```java
public interface LoanPolicy {
    LocalDate dueDateFor(Book book, Member member, LocalDate borrowedOn);
    int maxConcurrentLoans(Member member);
}

public interface LateFeePolicy {
    Money feeFor(Loan loan, Book book, LocalDate today);
}
```

Students get longer loans; reference books get shorter ones; fees are capped at replacement cost. All of that lives here rather than in `Lending`.

```java
public final class CappedDailyFee implements LateFeePolicy {
    private final Money perDay;

    public Money feeFor(Loan loan, Book book, LocalDate today) {
        Money raw = perDay.times(loan.daysOverdue(today));
        return raw.isGreaterThan(book.replacementCost()) ? book.replacementCost() : raw;
    }
}
```

### The service coordinates

```java
public final class Lending {
    public Loan borrow(MemberId memberId, Isbn isbn) {
        Member member = members.require(memberId);
        if (loans.activeCountFor(memberId) >= loanPolicy.maxConcurrentLoans(member)) {
            throw new BorrowLimitReached(memberId);
        }
        if (fees.outstandingFor(memberId).isGreaterThan(Money.ZERO)) {
            throw new OutstandingFees(memberId);
        }
        BookCopy copy = copies.claimAvailable(isbn)          // atomic: find and mark ON_LOAN
            .orElseThrow(() -> new NoCopyAvailable(isbn));
        LocalDate due = loanPolicy.dueDateFor(books.require(isbn), member, clock.today());
        return loans.open(new Loan(LoanId.random(), copy.id(), memberId, clock.today(), due));
    }
}
```

`claimAvailable` is one atomic operation rather than find-then-mark. That is the check-then-act race, and putting it in the repository is how you make it atomic in one place.

### Holds

```java
public final class Hold {
    private final Isbn isbn;
    private final MemberId memberId;
    private final Instant placedAt;
    private HoldStatus status;               // WAITING, READY, COLLECTED, EXPIRED
}
```

On return, the oldest waiting hold for that ISBN becomes `READY`, the copy is reserved rather than shelved, and the member is notified — via an event, so notification failures cannot fail the return.""",
            ),
            (
                "Example",
                """A borrow, a late return and a hold, traced.

**Borrow.** Member M asks for ISBN X. Active loan count is 3 against a limit of 5 — fine. No outstanding fees. `copies.claimAvailable(X)` atomically finds copy C7 with status AVAILABLE and flips it to ON_LOAN. `LoanPolicy` says students get 28 days. A `Loan` is opened.

**Late return.** M returns C7 eleven days after the due date. `daysOverdue` is 11; at 25 cents a day the raw fee is 2.75, under the replacement cost of 24.99, so the fee is 2.75. The loan's `returnedOn` is set, and the copy's next state depends on holds.

**Hold.** Member N placed a hold on X four days ago and it is the oldest waiting. Instead of going back to AVAILABLE, C7 becomes RESERVED for N, the hold becomes READY with a collection deadline, and a `HoldReady` event is published. If N does not collect in time, the hold expires and the next hold — or the shelf — gets the copy.

The design point to say out loud: return and notification are separated by the event. A mail server outage must not prevent a book being returned.""",
            ),
            (
                "Trade-offs",
                """- **Loan as an entity versus a status on the copy.** The entity costs a table and gives you history, overdue queries and fee provenance. Almost always worth it.
- **Borrow limit on `Member` versus in `Lending`.** On the member is natural to read and forces the entity to query loans; in the service keeps entities pure and spreads the rule slightly. Pick one and justify.
- **Reserve-on-return versus first-come-first-served.** Holds improve fairness and add an expiry path and a reserved state.
- **Denormalising availability.** A per-ISBN available count avoids scanning copies, at the cost of keeping it consistent with the copy rows.""",
            ),
            (
                "Common Mistakes",
                """- One `Book` class used as both the title and the physical copy
- Loan modelled as a boolean on the copy, losing all history
- Fee arithmetic inline in the return path, so a rate change touches lending
- Find-then-mark when claiming a copy, allowing two members to borrow the same one
- `LocalDate.now()` inside the domain, which makes every overdue test time-dependent
- Notification called synchronously inside the return, so an email outage blocks returns""",
            ),
            (
                "Evolution Under Pressure",
                """**"Multiple branches."** `BookCopy` already has a `BranchId`. Borrowing becomes branch-scoped, and transfers are a new operation with an in-transit copy status.

**"Two members borrow the last copy simultaneously."** `claimAvailable` must be atomic: a conditional update — `UPDATE copies SET status='ON_LOAN' WHERE id=? AND status='AVAILABLE'` — where zero rows updated means someone else won.

**"E-books with unlimited copies."** The copy concept changes shape: a licence with a concurrency limit rather than a physical item. `LoanPolicy` handles the different loan period; the catalogue is unchanged. This is a good moment to note that `BookCopy` was the right abstraction precisely because it absorbed this.

**"Fee rules change constantly."** Already a policy. Composite fee policies handle per-member-type and per-item-type rules.

**"Send an overdue reminder every day."** A scheduled job querying `loans.overdueAsOf(today)`, publishing events. The query lives on the repository as a named domain method, not as raw SQL in the job.

**"A hundred thousand titles."** Catalogue search moves behind a `Catalogue` interface backed by an index rather than a scan. The interface already exists, so nothing above it changes.""",
            ),
            (
                "Interviewer Follow-up Questions",
                """**"Why separate `Book` from `BookCopy`?"** Identity. Copies are independently borrowable, losable and branch-located; titles are shared metadata. One class cannot represent three copies of the same title.

**"Why is `Loan` an entity?"** Because it has a lifecycle and history matters. A boolean on the copy cannot answer who had it last month or why a fee was charged.

**"Where does the borrow limit belong?"** In `Lending` with the count coming from the loan repository, because the rule needs data the member does not hold. Putting it on `Member` would force the entity to query.

**"How do you prevent double-borrowing the last copy?"** An atomic claim — a conditional update — rather than a check followed by a write.

**"Where do late fees live?"** In a `LateFeePolicy`, capped at replacement cost, injected into the return path. Fee rules change independently of lending.""",
            ),
            (
                "Interview Tip",
                """Lead with the title/copy split and justify it with the identity test. It is the whole problem in one sentence.

> "The first thing I want to separate is the title from the physical copy. Two copies of the same ISBN share metadata but are independently borrowable and losable, so `Book` holds the catalogue data and `BookCopy` is the item with a status and a branch. Everything else — loans, holds, availability — hangs off the copy, and the catalogue searches titles."

If you get that out in the first ninety seconds, the rest of the interview is straightforward.""",
            ),
        ],
        [
            "Book is the title; BookCopy is the physical item — the identity test separates them.",
            "Loan is an entity with a lifecycle, not a boolean on the copy.",
            "Loan period and late fees are policies because they change independently.",
            "Claiming a copy must be atomic, or two members borrow the last one.",
            "Publish a return event so a notification failure cannot block a return.",
        ],
        [
            "Why must a title and a copy be separate entities?",
            "Where does the borrow-limit rule belong, and why?",
            "How do you prevent two members borrowing the last copy at once?",
            "How would you add e-books to this model?",
        ],
    )


def _chess_topic() -> dict:
    return _case(
        "chess",
        "Practice: Chess",
        "A rules-engine LLD where polymorphism does the work and the special cases are the interview.",
        "Board, pieces, moves and rules — the problem that rewards putting movement on the piece and validity on the game.",
        "HARD",
        24,
        15,
        "Chess is asked because it has an obvious wrong answer — one enormous `isValidMove` method — and a clean right one. The right one puts movement on the piece and legality on the game, then handles the special rules (castling, en passant, promotion, check) as explicitly modelled cases rather than as accumulated conditionals.",
        [
            (
                "Why It Matters",
                """Two layers of rules exist here and conflating them is the classic failure.

**Pseudo-legal movement** is what a piece's geometry allows: a bishop moves diagonally, a knight in an L, a rook in straight lines. This belongs to the piece.

**Legality** is whether the move is allowed in this position: does it leave your own king in check, is the path blocked, does the castling right still exist. This belongs to the game, because it needs the whole board.

A design that puts both on the piece forces every piece to know about check. A design that puts both on the board produces the 300-line method. Separating them is the insight.

The second reason this is asked: the special rules — castling, en passant, promotion, fifty-move, threefold repetition — are a test of whether you model state or bolt on flags.""",
            ),
            (
                "Requirements & Scope",
                """**Functional**

- Represent a board and pieces.
- Generate the legal moves for a position.
- Apply a move, alternate turns, detect check, checkmate and stalemate.
- Handle castling, en passant and promotion.

**Out of scope unless asked:** an engine or AI, opening books, time controls, network play, PGN parsing.

**Assumptions to state**

- Standard 8x8 chess, two players.
- Move legality is validated by the system; the UI just submits moves.
- Undo is wanted — which means a move must carry enough to reverse itself.""",
            ),
            (
                "How It Works",
                """### Coordinates as a value object

```java
public record Square(int file, int rank) {           // file 0-7 = a-h, rank 0-7 = 1-8
    public boolean isOnBoard() {
        return file >= 0 && file < 8 && rank >= 0 && rank < 8;
    }
    public Square offset(int df, int dr) { return new Square(file + df, rank + dr); }
}
```

Using a value object rather than two `int` parameters removes an entire class of transposition bug, and it is a cheap taste signal early in the interview.

### Pieces generate pseudo-legal moves

```java
public sealed interface Piece permits King, Queen, Rook, Bishop, Knight, Pawn {
    Colour colour();
    List<Move> pseudoLegalMoves(Board board, Square from);
}

public record Bishop(Colour colour) implements Piece {
    private static final int[][] DIRECTIONS = { {1,1}, {1,-1}, {-1,1}, {-1,-1} };

    public List<Move> pseudoLegalMoves(Board board, Square from) {
        return SlidingMoves.along(board, from, colour, DIRECTIONS);
    }
}

public record Knight(Colour colour) implements Piece {
    private static final int[][] JUMPS = { {1,2},{2,1},{2,-1},{1,-2},{-1,-2},{-2,-1},{-2,1},{-1,2} };

    public List<Move> pseudoLegalMoves(Board board, Square from) {
        List<Move> moves = new ArrayList<>();
        for (int[] jump : JUMPS) {
            Square to = from.offset(jump[0], jump[1]);
            if (to.isOnBoard() && board.isEmptyOrEnemy(to, colour)) moves.add(Move.normal(from, to));
        }
        return moves;
    }
}
```

Rook, bishop and queen share sliding logic, so it lives in one helper rather than in a shared base class — composition over inheritance, applied where it actually matters.

### The game decides legality

```java
public final class Game {
    private final Board board;
    private Colour toMove = Colour.WHITE;
    private final Deque<Move> history = new ArrayDeque<>();
    private CastlingRights castlingRights = CastlingRights.all();
    private Square enPassantTarget;               // null unless a pawn just advanced two

    public List<Move> legalMoves() {
        return board.piecesOf(toMove).stream()
            .flatMap(entry -> entry.piece().pseudoLegalMoves(board, entry.square()).stream())
            .filter(this::leavesOwnKingSafe)       // the rule pieces must not know about
            .toList();
    }

    private boolean leavesOwnKingSafe(Move move) {
        MoveRecord record = board.apply(move);     // make
        boolean safe = !board.isAttacked(board.kingSquare(toMove), toMove.opponent());
        board.undo(record);                        // unmake
        return safe;
    }
}
```

**Make-move, test, unmake-move** is the standard technique and the one interviewers hope to hear. Copying the whole board per candidate move also works and is slower; say which you chose.

### Special moves are modelled, not flagged

```java
public sealed interface Move {
    Square from();
    Square to();

    record Normal(Square from, Square to) implements Move {}
    record Capture(Square from, Square to, Piece captured) implements Move {}
    record Castle(Square from, Square to, Square rookFrom, Square rookTo) implements Move {}
    record EnPassant(Square from, Square to, Square capturedPawn) implements Move {}
    record Promotion(Square from, Square to, Piece promoteTo) implements Move {}
}
```

Because `Move` is sealed, applying a move is an exhaustive switch — adding a move type produces compile errors everywhere it must be handled. And because each record carries what it changed, undo is straightforward: a capture knows the captured piece, a castle knows both rook squares.

Castling also needs game state, not just board state: the rights are lost when a king or rook moves, even if it moves back. That is why `CastlingRights` lives on `Game` and is part of what a move record must restore.

### Terminal conditions fall out

- **Checkmate:** king is attacked and `legalMoves()` is empty.
- **Stalemate:** king is not attacked and `legalMoves()` is empty.

Both are one line once legal move generation is correct, which is a good thing to point out — it shows the decomposition paid off.""",
            ),
            (
                "Example",
                """Generating white's legal moves in a position where the white king is on e1, a white bishop on e2, and a black rook on e8.

The bishop's `pseudoLegalMoves` happily returns diagonal moves — it knows nothing about the rook. `legalMoves()` then filters: for each bishop move, apply it, ask whether e1 is attacked, unapply. Every bishop move off the e-file exposes the king to the rook, so all of them are filtered out. The bishop is pinned, and nothing in the design ever mentions the word "pin".

That is the payoff of separating the two layers: a rule nobody implemented emerges from the composition.

Now the special case. White plays e2-e4 with a pawn; black has a pawn on d4. A `Move.EnPassant` from d4 to e3 becomes available for exactly one ply, because `enPassantTarget` is set when a pawn advances two and cleared on the next move. Modelling it as a square on the game — rather than as a flag on the pawn — is what makes "exactly one ply" automatic.""",
            ),
            (
                "Trade-offs",
                """- **Make/unmake versus copy-on-apply.** Make/unmake is fast and requires a careful undo; copying is simple, allocation-heavy, and impossible to get wrong. For an interview, say make/unmake and explain why.
- **Sealed hierarchy versus an enum for pieces.** Sealed gives per-piece move generation and exhaustive switches; an enum with a type field is compact and pushes you back toward conditionals.
- **8x8 array versus a map.** An array is simple and cache-friendly; bitboards are what engines use and are far beyond the scope of an LLD interview — mention them as the scaling answer, do not implement them.
- **Generating all legal moves versus validating one.** Generating all is needed for checkmate detection anyway, so it is usually the right primitive.""",
            ),
            (
                "Common Mistakes",
                """- One giant `isValidMove` with a branch per piece type
- Putting check detection inside the pieces, so every piece needs the whole game
- Flags for castling and en passant instead of modelled state that a move can restore
- Forgetting that castling rights are lost permanently once a king or rook moves
- No undo information on the move, making make/unmake impossible
- Treating stalemate as checkmate, which is a rules bug an interviewer will check""",
            ),
            (
                "Evolution Under Pressure",
                """**"Add undo."** Already possible: each move record carries the captured piece, the previous castling rights and the previous en-passant square. Undo pops the history and restores them. This is the command pattern, and saying so connects the design to a named pattern.

**"Support draw by repetition and the fifty-move rule."** Both need history, not just the current position. Repetition needs a hash of each position — a Zobrist hash is the standard technique — and the fifty-move rule needs a halfmove clock reset by pawn moves and captures.

**"Two players over a network."** The `Game` becomes the authority; clients propose moves and the server validates with `legalMoves().contains(move)`. Never trust a client-side validation.

**"Support chess variants."** Movement is already per-piece, so a new piece is a new record. A variant with different board size needs `Square` bounds to become configurable rather than hard-coded 8 — which is worth noticing as a limitation of the simple version.

**"Make it fast enough for an engine."** Out of scope for LLD, but the honest answer is bitboards, incremental attack maps and legal-move generation that avoids make/unmake for most moves. Naming those without implementing them is the right depth.""",
            ),
            (
                "Interviewer Follow-up Questions",
                """**"Where does move validation live?"** Split in two. Geometry lives on the piece as pseudo-legal moves; legality — check, pins, castling rights — lives on the game, because it needs the whole position.

**"How do you detect check?"** Ask whether the opponent attacks the king's square. Attack generation is the same pseudo-legal move generation reused, which is why keeping it on the piece pays off.

**"How do you handle castling?"** As a modelled move type carrying both king and rook squares, gated on castling rights held by the game, the squares between being empty, and the king not being in or passing through check.

**"How do you implement undo?"** Each move record stores what it changed — captured piece, previous rights, previous en-passant square — so unmake restores the exact prior position. It is the command pattern.

**"How do you detect checkmate versus stalemate?"** Both are "no legal moves". Checkmate additionally requires the king to be attacked; stalemate requires it not to be.""",
            ),
            (
                "Interview Tip",
                """Say the two-layer split in your opening sentence. It is the entire structural insight and it prevents the god-method.

> "I want two layers. Each piece generates its pseudo-legal moves from geometry alone — a bishop knows about diagonals and nothing else. The game then filters those for legality, which mostly means applying the move, checking whether my own king is attacked, and unapplying. That way pins and discovered checks work without any piece knowing what a pin is."

The last clause is the one that lands, because it shows the decomposition produces behaviour rather than just tidiness.""",
            ),
        ],
        [
            "Pieces generate pseudo-legal moves; the game filters them for legality.",
            "Make-move, test for check, unmake is the standard validation technique.",
            "Model castling, en passant and promotion as move types, not as flags.",
            "Pins and discovered checks emerge from the filter without being implemented.",
            "Checkmate and stalemate are both 'no legal moves'; the king's safety distinguishes them.",
        ],
        [
            "Where does move validation belong, and why is it split?",
            "How do you detect check efficiently?",
            "How do castling and en passant fit the model?",
            "How would you implement undo?",
        ],
    )


def _rate_limiter_topic() -> dict:
    return _case(
        "ood-rate-limiter",
        "Practice: Rate Limiter",
        "The bridge problem between low-level design and system design, with four algorithms and a distributed follow-up.",
        "Allow or reject a request — a small API with real algorithm choices and an inevitable multi-instance question.",
        "MEDIUM",
        25,
        15,
        "A rate limiter has a one-method interface and a surprising amount of design behind it. It is the problem interviewers use to move from object design to systems thinking, because the moment you put it behind a load balancer every in-process answer stops working. Knowing the four algorithms and their trade-offs is the core of a good answer.",
        [
            (
                "Why It Matters",
                """The API is trivial — `boolean allow(key)` — so all the signal is in what sits behind it.

Four things get tested: whether you know more than one algorithm, whether you inject the clock, whether you get the concurrency right, and whether you have a real answer for multiple instances. That last one is where most candidates stop, and it is the question that actually differentiates.

There is also a judgement question that good candidates raise unprompted: **which direction should it fail?** If the limiter's backing store is unreachable, does the API reject everything or allow everything? Failing closed makes your limiter able to take down the service it protects. Failing open means an outage removes protection. Naming the choice is worth more than the implementation.""",
            ),
            (
                "Requirements & Scope",
                """**Functional**

- `allow(key)` returns whether a request may proceed.
- Limits configurable per key and per endpoint.
- Report remaining quota and retry-after for response headers.

**Out of scope:** the HTTP layer, billing, quota purchasing.

**Assumptions to state**

- Keys are client identifiers — API key, user id, IP — possibly combined with an endpoint.
- Limits are of the form "N requests per window".
- Start single-process; the interviewer will add instances.""",
            ),
            (
                "How It Works",
                """### Four algorithms, and when each is right

| Algorithm | Memory per key | Burst behaviour | Boundary problem |
| --- | --- | --- | --- |
| **Fixed window** | One counter | Allows 2N across a boundary | Yes — the main flaw |
| **Sliding window log** | One timestamp per request | Exact | No |
| **Sliding window counter** | Two counters | Approximate, good | Mostly solved |
| **Token bucket** | Two numbers | Allows a controlled burst | No |

**Fixed window** is the simplest and has a real flaw: with a limit of 100 per minute, a client can send 100 at 11:59:59 and 100 at 12:00:00 — 200 requests in one second. Say this; it is the reason the others exist.

**Sliding window log** stores a timestamp per request and counts those inside the window. Exact, and memory grows with the limit — 10,000 requests per hour is 10,000 timestamps per key.

**Sliding window counter** keeps the current and previous window counts and weights the previous one by how far into the current window you are. Approximate, two numbers per key, and what most production limiters use.

**Token bucket** refills tokens at a constant rate up to a capacity. It permits a burst up to the capacity and then enforces the average rate, which usually matches what an API actually wants.

### Token bucket, thread-safe and testable

```java
public interface RateLimiter {
    Decision check(RateKey key);
}

public record Decision(boolean allowed, int remaining, Duration retryAfter) {}

public final class TokenBucketLimiter implements RateLimiter {
    private final ConcurrentHashMap<RateKey, Bucket> buckets = new ConcurrentHashMap<>();
    private final LimitPolicy limits;
    private final Clock clock;

    public Decision check(RateKey key) {
        Limit limit = limits.forKey(key);
        Bucket bucket = buckets.computeIfAbsent(key, k -> new Bucket(limit.capacity(), clock.instant()));
        synchronized (bucket) {                                  // per key, never global
            bucket.refill(clock.instant(), limit.refillPerSecond(), limit.capacity());
            return bucket.tryConsume();
        }
    }

    private static final class Bucket {
        private double tokens;
        private Instant lastRefill;

        void refill(Instant now, double ratePerSecond, int capacity) {
            double elapsedSeconds = Duration.between(lastRefill, now).toNanos() / 1e9;
            tokens = Math.min(capacity, tokens + elapsedSeconds * ratePerSecond);
            lastRefill = now;
        }

        Decision tryConsume() {
            if (tokens < 1) return new Decision(false, 0, Duration.ofSeconds(1));
            tokens -= 1;
            return new Decision(true, (int) tokens, Duration.ZERO);
        }
    }
}
```

Three decisions to narrate. `computeIfAbsent` means two threads racing on a new key create one bucket, not two. The lock is per bucket, so different clients never contend. And `tokens` and `lastRefill` must move together — refilling without updating the timestamp grants tokens repeatedly — which is exactly why an `AtomicInteger` is not sufficient here.

The injected `Clock` is what makes the refill logic testable without sleeping.

### Returning useful information

A boolean is not enough for a real API. `Decision` carries the remaining quota and a retry-after, which map onto `X-RateLimit-Remaining` and `Retry-After` headers. Volunteering that shows you have implemented one rather than read about one.""",
            ),
            (
                "Example",
                """A deterministic test, which is the clearest way to demonstrate the design.

Capacity 5, refill 1 per second, clock fixed at T.

Five calls in a row: all allowed, remaining counts down 4, 3, 2, 1, 0. Sixth call: rejected, retry-after 1 second. No time has passed because the clock is injected and has not been advanced.

Advance the clock two seconds. Two tokens have refilled, so the next two calls are allowed and the third is rejected. Advance an hour: tokens cap at 5, not 3,600 — the capacity bound is what prevents an idle client from accumulating unlimited burst.

That last assertion is worth writing explicitly in the test, because a missing `Math.min` is the most common bug in a token bucket and it only shows up after a long idle period.""",
            ),
            (
                "Trade-offs",
                """- **Accuracy versus memory.** The sliding log is exact and stores a timestamp per request; the sliding counter is approximate and stores two numbers.
- **Burst tolerance.** Token bucket deliberately permits a burst. That is usually desirable for an API and undesirable for protecting a fragile downstream service, where leaky bucket's smooth output is better.
- **Per-key locking versus lock-free.** Per-key locks are simple and correct; a CAS loop on a packed long avoids blocking and is harder to read.
- **Fail open versus fail closed.** Open keeps the API up and removes protection; closed protects the backend and lets a limiter outage become an API outage. For a public API, open is usually right — state the choice.""",
            ),
            (
                "Common Mistakes",
                """- Only knowing fixed window, and not knowing its boundary flaw
- Calling `Instant.now()` inside the limiter, making every test rely on sleeping
- A global lock, so all clients contend with each other
- Forgetting to cap tokens at capacity, letting an idle client accumulate an unbounded burst
- An unbounded key map, which is a memory leak and a denial-of-service vector
- Returning only a boolean, with no remaining count or retry-after
- Assuming the in-process design still works behind a load balancer""",
            ),
            (
                "Evolution Under Pressure",
                """**"Four instances behind a load balancer."** Each holds its own buckets, so the effective limit is four times the configured one. Options: divide the limit by instance count, which breaks whenever the count changes during a deploy; or move the bucket to Redis and perform refill-and-consume in a single Lua script so it is atomic. Take the Redis script, and fail open when Redis is unreachable.

**"A million distinct keys."** The map grows without bound. Bound it with size-limited LRU eviction plus a TTL. An evicted key starts with a full bucket, which fails open — a deliberate choice to state rather than an accident.

**"Different limits per endpoint and per plan."** The limit moves out of the constructor into a `LimitPolicy` that resolves a key to a limit. The key itself becomes a composite of client and endpoint.

**"Redis adds latency to every request."** Two mitigations: a local token bucket that syncs periodically, accepting approximate global enforcement; or pre-allocating a batch of tokens per instance from a global pool, which is the approach large systems use.

**"Distinguish a burst from sustained abuse."** Two limiters composed — a small-capacity short-window one and a larger long-window one — and the request must pass both. Composition again, and it is one line of wiring.

**"How do you test the distributed version?"** Against a real Redis in an integration test, with the Lua script exercised directly. Unit-testing a mock of Redis tests the mock.""",
            ),
            (
                "Interviewer Follow-up Questions",
                """**"Which algorithm would you use and why?"** Token bucket by default: two numbers per key, no boundary problem, and a controlled burst that suits an API. Sliding window counter when I need to advertise a precise "N per minute" and bursts are unwelcome.

**"What is wrong with fixed window?"** The boundary. Twice the limit can pass in a very short interval around the window edge, which defeats the purpose during exactly the traffic spike you were protecting against.

**"How do you make it work across instances?"** Move the state to a shared store and make refill-and-consume atomic — a Redis Lua script. Local counters divided by instance count is a cheaper approximation that breaks during deploys.

**"What happens if Redis is down?"** A policy decision. I would fail open for a public API, because a limiter outage should not become a full outage — and I would alarm on it loudly.

**"How do you stop the key map growing forever?"** Bounded LRU plus TTL. Unbounded key tracking is both a memory leak and an attack vector: an attacker who rotates keys can exhaust memory.""",
            ),
            (
                "Interview Tip",
                """Name the algorithm, the concurrency granularity and the failure direction in one opening answer. Those three are what the whole question is about.

> "I would use a token bucket: two numbers per key, no boundary flaw, and it allows a small burst which is usually what an API wants. State goes in a `ConcurrentHashMap` with a lock per bucket so clients do not contend with each other, the clock is injected so the refill is testable without sleeping, and if the shared store is ever unreachable I would fail open and alarm — a rate limiter should never be the reason the API is down."

That is the complete answer before the follow-ups start.""",
            ),
        ],
        [
            "Token bucket: two numbers per key, no boundary flaw, controlled burst.",
            "Fixed window allows twice the limit around a boundary — that is why the others exist.",
            "Lock per bucket, not globally, and inject the clock so refill is testable.",
            "Cap tokens at capacity or an idle client accumulates unlimited burst.",
            "Decide and state the failure direction — a limiter must not take down the API.",
        ],
        [
            "Which rate-limiting algorithm would you choose and why?",
            "What is the boundary problem with a fixed window?",
            "How do you enforce one global limit across several instances?",
            "What happens when the shared store is unavailable?",
        ],
    )


def _atm_topic() -> dict:
    return _case(
        "atm",
        "Practice: ATM",
        "A state machine with money, hardware and a hard partial-failure question.",
        "Card, PIN, withdrawal and cash dispensing — where the interesting part is what happens when the machine jams.",
        "MEDIUM",
        26,
        14,
        "The ATM looks like the vending machine and diverges at the point that matters: the money is not in the machine, it is in a bank account behind a network call. That turns a tidy state machine into a distributed-transaction problem, and the question an interviewer is really asking is what happens when the debit succeeds and the cash does not come out.",
        [
            (
                "Why It Matters",
                """Everything up to dispensing is a straightforward state machine: no card, card inserted, authenticated, transacting. Candidates handle that.

The discriminating question is the failure window. The machine debits the account, then instructs the dispenser, and the dispenser jams. The customer's balance is down and they have no cash. Any answer that does not address this has missed the problem.

There is also a cash-denomination problem — which notes to dispense for a given amount — that is the same change-making decision as the vending machine, with the added rule that a request the machine cannot compose must be rejected before anything is debited.""",
            ),
            (
                "Requirements & Scope",
                """**Functional**

- Insert a card, authenticate with a PIN (limited attempts).
- Check balance, withdraw cash, deposit, print a receipt.
- Dispense notes from available denominations.
- Eject the card; handle a timeout with the card retained.

**Out of scope:** the card network protocol, physical security, fraud scoring.

**Assumptions**

- The account lives in a remote banking service; the ATM is a client.
- The cash dispenser is hardware that can fail mid-operation.
- The machine holds a known inventory of notes per denomination.""",
            ),
            (
                "How It Works",
                """### The state machine

```java
public interface AtmState {
    AtmState insertCard(Atm atm, Card card);
    AtmState enterPin(Atm atm, Pin pin);
    AtmState selectWithdrawal(Atm atm, Money amount);
    AtmState ejectCard(Atm atm);
}
```

States: `NoCard`, `CardInserted`, `Authenticated`, `Dispensing`, `OutOfService`. Transitions are the interesting part:

| State | Event | Next |
| --- | --- | --- |
| NoCard | insertCard | CardInserted |
| CardInserted | enterPin (correct) | Authenticated |
| CardInserted | enterPin (3rd failure) | NoCard, card retained |
| Authenticated | selectWithdrawal | Dispensing |
| Dispensing | dispenseComplete | Authenticated |
| Dispensing | dispenseFailed | OutOfService plus reversal |

The retained-card and the dispense-failure rows are the ones candidates forget, and they are the ones worth drawing first.

### Separated collaborators

```java
public interface BankService {
    Authentication authenticate(CardNumber card, Pin pin);
    Money balanceOf(AccountId account);
    TransactionId debit(AccountId account, Money amount, IdempotencyKey key);
    void reverse(TransactionId transaction, String reason);
}

public interface CashDispenser {
    DispenseResult dispense(List<NoteBundle> notes);       // can fail mid-way
    Map<Denomination, Integer> inventory();
}

public interface NoteSelector {
    Optional<List<NoteBundle>> select(Money amount, Map<Denomination, Integer> available);
}
```

Three separate things: the bank (network, slow, authoritative), the dispenser (hardware, can jam), and note selection (pure arithmetic, easy to test). Keeping note selection pure means the tricky algorithm has no dependencies at all.

### The withdrawal ordering

```java
public WithdrawalResult withdraw(AccountId account, Money amount) {
    List<NoteBundle> notes = noteSelector.select(amount, dispenser.inventory())
        .orElseThrow(() -> new CannotComposeAmount(amount));     // BEFORE any debit

    IdempotencyKey key = IdempotencyKey.random();
    TransactionId transaction = bank.debit(account, amount, key);

    DispenseResult result = dispenser.dispense(notes);
    if (result.isFailure()) {
        bank.reverse(transaction, "dispense failed: " + result.reason());
        throw new DispenseFailed(transaction, result.partialAmount());
    }
    return WithdrawalResult.success(transaction, notes);
}
```

Three orderings that matter, and all three are worth saying out loud.

**Compose the notes before debiting.** If the machine cannot make 45 from 20s and 50s, the customer must find out before their balance moves.

**The debit carries an idempotency key.** If the network times out, the ATM does not know whether the debit happened. With a key, a retry is safe and a reconciliation job can resolve the ambiguity.

**A dispense failure triggers a reversal, not a silent log.** And `partialAmount` matters: a dispenser that emitted two notes of five before jamming has given out 10, so the reversal is for the remainder, not the whole amount.

### Note selection is a bounded change-making problem

Greedy — largest denomination first — works for typical note sets but fails when a denomination runs out. With 20s and 50s and no 10s, greedy on 70 gives 50 then 20: fine. On 60 greedy gives 50 and then cannot complete, while 20+20+20 works.

The correct answer is the same small dynamic program as the vending machine, bounded by the notes actually in the cassettes. Say that greedy is a heuristic and the DP is the answer.""",
            ),
            (
                "Example",
                """A withdrawal of 60 where the machine holds three 20s and two 50s.

`NoteSelector.select(60, {20:3, 50:2})` runs the DP. Greedy would take a 50 and be stuck with 10 remaining. The DP finds 20+20+20 and returns three bundles. Nothing has been debited yet.

`bank.debit(account, 60, key-abc)` returns transaction T9. The dispenser emits three 20s and reports success. Receipt printed, state returns to `Authenticated`.

Now the failure. Same request, and the dispenser jams after two notes. `DispenseResult` reports failure with a partial amount of 40. The ATM calls `bank.reverse(T9, ...)` for the 20 not dispensed, moves to `OutOfService`, retains the card for the customer to recover with staff, and logs an incident with the transaction id.

Narrate the reversal amount explicitly. Reversing the full 60 after the customer received 40 is a real bug and it is the detail that shows you thought the failure through.""",
            ),
            (
                "Trade-offs",
                """- **Reserve the cash before debiting versus after.** Reserving first prevents two concurrent withdrawals from the same cassette; it needs a release path when the debit fails.
- **Idempotency key per attempt versus per session.** Per attempt is correct: a retried request reuses the same key, a new request gets a new one.
- **Fail open or closed on a bank timeout.** For money, closed: refuse the withdrawal. Guessing in the customer's favour is a business decision, not an engineering default.
- **Card retention on PIN failure.** Retaining is more secure and strands customers; ejecting with a lock on the account is friendlier. Say which and why.""",
            ),
            (
                "Common Mistakes",
                """- Debiting before confirming the amount can be composed from available notes
- Reversing the full amount after a partial dispense
- No idempotency key, so a network timeout means the outcome is unknowable
- One class doing authentication, bank calls, note selection and hardware control
- Greedy note selection presented as always correct
- Ignoring the PIN attempt limit and the card-retention path""",
            ),
            (
                "Evolution Under Pressure",
                """**"The network drops during the debit."** The outcome is unknown. Because the debit carried an idempotency key, a retry is safe; if the retry also fails, the transaction is marked pending and a reconciliation job settles it against the bank's record.

**"Two ATMs, one account, simultaneous withdrawals."** The ATM is not the authority — the bank is. Balance checks must be enforced by the debit itself, conditionally, not by a prior read on the ATM.

**"Add deposits."** A deposit is a different state path with its own hardware failure mode: notes accepted but not counted. Envelope deposits become pending until a human verifies, which is a good example of a business process absorbing a hardware limitation.

**"Multi-currency."** `Money` already carries a currency; cassettes become per-currency and note selection is scoped to one. The design absorbs it because money was never a `long`.

**"Audit everything."** Publish events for each transition — `CardInserted`, `AuthenticationFailed`, `Debited`, `DispenseFailed` — to an append-only log. Audit must never be able to fail a transaction, which is why it is an event rather than a call.

**"How do you test the jam?"** A fake `CashDispenser` that fails on demand with a configurable partial amount. This is exactly what the interface separation was for, and it is worth naming the payoff.""",
            ),
            (
                "Interviewer Follow-up Questions",
                """**"What happens if cash is debited but not dispensed?"** The dispenser reports failure with a partial amount, the ATM reverses the undispensed remainder against the same transaction, and the machine goes out of service with an incident logged.

**"How do you handle a network timeout on the debit?"** Treat the outcome as unknown. The idempotency key makes a retry safe; if it stays ambiguous, mark it pending and reconcile.

**"How do you choose which notes to dispense?"** A dynamic program over the requested amount bounded by the notes in the cassettes, run before any debit. Greedy is a heuristic that fails when a denomination is exhausted.

**"Where does the balance check happen?"** In the bank, as part of the conditional debit. Checking on the ATM first is a read that can be stale, so it is a user-experience nicety and never the enforcement point.

**"What are the states?"** NoCard, CardInserted, Authenticated, Dispensing and OutOfService, with card retention after three failed PINs and a transition to OutOfService on a dispense failure.""",
            ),
            (
                "Interview Tip",
                """Lead with the ordering rule. It is the whole problem and it takes one sentence.

> "The sequence matters more than the classes here: compose the notes first, then debit with an idempotency key, then dispense, and reverse the undispensed remainder if the hardware fails. Composing first means a customer who asks for an amount we cannot make in notes never has their balance touched, and the idempotency key means a network timeout is recoverable rather than ambiguous."

You have named the failure window and the two mechanisms that handle it before being asked.""",
            ),
        ],
        [
            "Compose the notes before debiting, or the balance moves for a request that cannot be served.",
            "Debit with an idempotency key so a network timeout is recoverable.",
            "On a partial dispense, reverse only the undispensed remainder.",
            "The bank is the authority on balance; an ATM-side check is only a convenience.",
            "Note selection is bounded change-making, not greedy.",
        ],
        [
            "What happens if the account is debited but the cash does not dispense?",
            "How do you handle a network timeout during the debit?",
            "How do you choose which notes to dispense?",
            "Where is the balance actually enforced?",
        ],
    )


def _splitwise_topic() -> dict:
    return _case(
        "splitwise",
        "Practice: Splitwise",
        "Expense sharing, split strategies and the debt-simplification algorithm interviewers ask for.",
        "Groups, expenses, splits and balances — a modelling problem with a genuine algorithm at the end.",
        "MEDIUM",
        27,
        14,
        "Splitwise is a favourite because it has three separable parts: modelling expenses and splits, maintaining balances correctly with money arithmetic, and simplifying a web of debts into the fewest transfers. The last part is a real algorithm, and candidates who model the first two cleanly get there with time to spare.",
        [
            (
                "Why It Matters",
                """Three things are being tested.

**Split types as a strategy.** Equal, exact amounts, percentages and shares are four rules over the same data. If they are a switch inside `Expense`, adding "split by nights stayed" is surgery.

**Money arithmetic.** Splitting 100 three ways gives 33.33 three times, which is 99.99. The missing cent has to go somewhere, deterministically. Interviewers ask about this precisely because `double` users never notice it.

**Balance representation.** A naive design stores every pairwise debt and recomputes constantly. A better one stores a net balance per person per group, which makes the simplification algorithm straightforward.""",
            ),
            (
                "Requirements & Scope",
                """**Functional**

- Create a group of users.
- Add an expense: who paid, how much, who shares it, and how it is split.
- Show what each member owes or is owed.
- Settle up between two members.
- Simplify debts to the minimum number of transfers.

**Out of scope:** payments, currency conversion, notifications, receipt scanning.

**Assumptions**

- One currency per group, so `Money` carries a currency and mixing throws.
- Amounts in integer minor units — cents — never floating point.""",
            ),
            (
                "How It Works",
                """### Money first

```java
public record Money(long cents, Currency currency) {
    public Money plus(Money other) { requireSameCurrency(other); return new Money(cents + other.cents, currency); }
    public Money minus(Money other) { requireSameCurrency(other); return new Money(cents - other.cents, currency); }
    public boolean isZero() { return cents == 0; }
}
```

Integer cents. Say this in the first minute — using `double` for money is the single most common disqualifying detail in this problem.

### Split as a strategy

```java
public interface SplitStrategy {
    Map<UserId, Money> split(Money total, List<UserId> participants, SplitConfig config);
}

public final class EqualSplit implements SplitStrategy {
    public Map<UserId, Money> split(Money total, List<UserId> participants, SplitConfig config) {
        int n = participants.size();
        long base = total.cents() / n;
        long remainder = total.cents() % n;          // the cents that do not divide

        Map<UserId, Money> shares = new LinkedHashMap<>();
        for (int i = 0; i < n; i++) {
            long cents = base + (i < remainder ? 1 : 0);    // deterministic: first N pay the extra
            shares.put(participants.get(i), new Money(cents, total.currency()));
        }
        return shares;
    }
}
```

The remainder handling is the detail interviewers look for. 100 split three ways becomes 34, 33, 33 — the sum is exactly 100, and the rule for who pays the extra cent is explicit rather than accidental.

`ExactSplit` validates that the parts sum to the total. `PercentageSplit` validates that percentages sum to 100 and then distributes the rounding remainder the same way. `ShareSplit` — two shares for the couple, one each for the singles — is the same arithmetic with weights.

### Expenses and balances

```java
public record Expense(
    ExpenseId id,
    GroupId groupId,
    UserId paidBy,
    Money total,
    Map<UserId, Money> shares,       // computed once, stored
    Instant createdAt,
    String description) {}
```

Storing the computed shares rather than the strategy means the expense is immutable history: changing the equal-split rule later must not silently rewrite what people already agreed.

```java
public final class BalanceSheet {
    private final Map<UserId, Money> net = new HashMap<>();     // positive = is owed

    public void apply(Expense expense) {
        add(expense.paidBy(), expense.total());                 // payer is owed the whole amount
        expense.shares().forEach((user, share) -> subtract(user, share));   // each owes their share
    }
}
```

A net balance per person, not a pairwise matrix. The invariant to state: **the net balances of a group always sum to zero.** That is a one-line assertion that catches almost every arithmetic bug.

### Debt simplification

The question: given net balances, what is the minimum number of transfers that settles everyone?

```java
public List<Transfer> simplify(Map<UserId, Money> net) {
    PriorityQueue<Entry> creditors = new PriorityQueue<>(byAmountDescending);
    PriorityQueue<Entry> debtors = new PriorityQueue<>(byAmountDescending);
    // positive balances into creditors, negative (as positive magnitudes) into debtors

    List<Transfer> transfers = new ArrayList<>();
    while (!creditors.isEmpty() && !debtors.isEmpty()) {
        Entry creditor = creditors.poll();
        Entry debtor = debtors.poll();
        long amount = Math.min(creditor.cents(), debtor.cents());

        transfers.add(new Transfer(debtor.user(), creditor.user(), Money.cents(amount)));

        if (creditor.cents() > amount) creditors.add(creditor.minus(amount));
        if (debtor.cents() > amount)   debtors.add(debtor.minus(amount));
    }
    return transfers;
}
```

Repeatedly match the largest creditor with the largest debtor. Each step zeroes at least one person, so it produces at most N-1 transfers for N people.

Be honest about what this is: **minimising the number of transfers exactly is NP-hard** — it is a partition problem in disguise. This greedy heuristic is what production systems use, it is O(n log n), and it is never worse than N-1. Saying that is far stronger than claiming optimality.""",
            ),
            (
                "Example",
                """A trip with Alice, Bob and Carol.

Alice pays 90 for dinner, split equally: shares are 30, 30, 30. Net becomes Alice +60, Bob -30, Carol -30.

Bob pays 45 for taxis, split equally: 15 each. Net becomes Alice +45, Bob 0, Carol -45.

Carol pays 20 for coffee, split equally between Carol and Alice only: 10 each. Net becomes Alice +35, Bob 0, Carol -35.

Check the invariant: 35 + 0 - 35 = 0. Good.

Simplification: largest creditor is Alice at 35, largest debtor is Carol at 35. One transfer — Carol pays Alice 35 — and everyone is settled. Bob makes no payment at all, which is the whole point of simplification: without it Bob would be paying Alice and receiving from Carol in separate transfers.

Now the rounding case. Alice pays 100 split three ways: 34, 33, 33. Alice's net is +100 -34 = +66, Bob -33, Carol -33, summing to zero. Had the shares been 33.33 each, the sum would be 99.99 and someone would be a cent short forever.""",
            ),
            (
                "Trade-offs",
                """- **Net balances versus a pairwise ledger.** Net is compact and simplification-friendly; pairwise preserves who owed whom, which some users want to see.
- **Storing computed shares versus recomputing.** Storing makes expenses immutable history at the cost of duplication; recomputing risks a rule change altering the past.
- **Simplify automatically versus on demand.** Automatic hides the original structure and confuses users; on demand is a button, which is what real products do.
- **Remainder allocation.** First-N-pay-extra is deterministic and mildly unfair; rotating who absorbs it across expenses is fairer and needs extra state.""",
            ),
            (
                "Common Mistakes",
                """- `double` or `float` for money
- Splitting without handling the remainder, so totals drift by cents
- Split logic as a switch inside `Expense` rather than a strategy
- A pairwise debt matrix that grows quadratically and complicates simplification
- Claiming the greedy simplification is optimal when the exact problem is NP-hard
- Forgetting to validate that exact splits sum to the total and percentages to 100""",
            ),
            (
                "Evolution Under Pressure",
                """**"Multiple currencies."** `Money` already carries one. Either restrict a group to one currency, or store an expense in its original currency with an exchange rate snapshot at creation time — never a live rate, or historical balances move.

**"Edit or delete an expense."** Expenses are immutable history, so an edit is a reversing entry plus a new expense. That keeps the audit trail and makes balances recomputable from the log.

**"Group of fifty people."** Net balances are O(n) and simplification is O(n log n), so this is fine. A pairwise matrix would be 2,500 entries, which is why the net representation matters.

**"Show who owes whom without simplifying."** Keep the expense log and derive pairwise debts on demand. The log is the source of truth; both views are projections of it.

**"Two people add expenses at the same time."** Balances are derived, so the safe design appends expenses and recomputes rather than incrementally mutating a shared balance. If balances are cached, the cache is invalidated per group and rebuilt from the log.

**"Settle up partially."** A settlement is just another expense: a transfer from one member to another with a single share. Modelling it that way means no new code path.""",
            ),
            (
                "Interviewer Follow-up Questions",
                """**"How do you represent money?"** Integer minor units in a `Money` value object with an explicit currency. Never floating point, and mixing currencies throws rather than silently converting.

**"100 split three ways — what happens?"** 34, 33, 33. The remainder is distributed one cent at a time by a deterministic rule, so the shares always sum to the total exactly.

**"How do you minimise the number of settlements?"** Greedily match the largest creditor with the largest debtor. At most N-1 transfers, O(n log n). The exact minimisation is NP-hard, so this is the heuristic everyone uses.

**"Why net balances rather than pairwise debts?"** Net is O(n) instead of O(n squared) and is exactly the input simplification needs. Pairwise detail is still derivable from the expense log when a user wants it.

**"How do you handle an expense being edited?"** Append a reversal and a replacement rather than mutating. Balances stay derivable from an immutable log, which also gives you an audit trail.""",
            ),
            (
                "Interview Tip",
                """Open with money representation and the remainder rule. It takes fifteen seconds and immediately separates you.

> "Before anything else: money is integer cents in a `Money` value object with a currency, because splitting 100 three ways has to produce 34, 33, 33 and not three lots of 33.33. Split types go behind a `SplitStrategy` interface since equal, exact, percentage and share are the same operation with different rules, and I will keep net balances per member rather than a pairwise matrix because that is what the simplification algorithm consumes."

Three design decisions, each justified, before drawing a single class.""",
            ),
        ],
        [
            "Money is integer minor units in a value object — never a double.",
            "Distribute the split remainder deterministically so shares sum to the total exactly.",
            "Split types are a strategy; storing computed shares keeps expenses immutable.",
            "Net balances per member beat a pairwise matrix and feed the simplification directly.",
            "Greedy largest-creditor-to-largest-debtor gives at most N-1 transfers; exact is NP-hard.",
        ],
        [
            "How do you represent money and handle the split remainder?",
            "How do you minimise the number of settlement transfers?",
            "Why store net balances rather than pairwise debts?",
            "What happens when an expense is edited after the fact?",
        ],
    )


def _movie_booking_topic() -> dict:
    return _case(
        "movie-booking",
        "Practice: Movie Ticket Booking",
        "Seat reservation under concurrency — the double-booking problem interviewers actually care about.",
        "Cinemas, shows, seats and payment, where the whole interview is really about holds and expiry.",
        "HARD",
        28,
        14,
        "Movie booking looks like a catalogue problem and is really a concurrency problem. Two users clicking the same seat at the same moment is the scenario every interviewer walks toward, and the good answer involves a temporary hold with an expiry rather than a lock held across a payment call.",
        [
            (
                "Why It Matters",
                """The naive flow is: check seats free, take payment, mark seats booked. It has two defects and both are fatal.

**The race.** Two users both see the seat as free, both pay, and one of them gets a refund and a bad experience.

**The lock across I/O.** Holding a database lock or a mutex while a payment gateway takes several seconds serialises the whole show and can exhaust a connection pool.

The correct shape is a **hold**: reserve the seats atomically for a short window, take payment while holding, then confirm. If payment fails or the window expires, the hold is released. That is the design the interviewer is steering toward, and getting there quickly leaves time for the interesting follow-ups.""",
            ),
            (
                "Requirements & Scope",
                """**Functional**

- Browse cinemas, movies and showtimes.
- See the seat map for a show with live availability.
- Select seats, hold them briefly, pay, and receive a booking.
- Cancel a booking within a policy window.

**Out of scope:** pricing promotions beyond a seat-class multiplier, loyalty, food ordering, actual payment processing.

**Assumptions**

- A show is one movie in one screen at one time; seats belong to the screen.
- A hold lasts a fixed window — say ten minutes — and expires automatically.
- Multiple application instances serve the same show.""",
            ),
            (
                "How It Works",
                """### The model

```java
public record SeatId(String row, int number) {}
public record ShowId(UUID value) {}

public final class Screen {
    private final ScreenId id;
    private final List<Seat> seats;                 // physical layout, static
}

public record Seat(SeatId id, SeatClass seatClass) {}   // REGULAR, PREMIUM, RECLINER

public final class Show {
    private final ShowId id;
    private final MovieId movie;
    private final ScreenId screen;
    private final Instant startsAt;
    private final PricingPolicy pricing;
}
```

Seats belong to the screen and are static; **availability belongs to the show**. Conflating them is the modelling error that makes everything else harder — a seat is not "booked", a seat-for-a-given-show is.

```java
public enum SeatStatus { AVAILABLE, HELD, BOOKED }

public record ShowSeat(ShowId show, SeatId seat, SeatStatus status,
                       HoldId holdId, Instant holdExpiresAt) {}
```

### The hold is the whole design

```java
public interface SeatInventory {
    Optional<Hold> hold(ShowId show, List<SeatId> seats, Duration ttl);   // atomic, all-or-nothing
    void release(HoldId hold);
    Booking confirm(HoldId hold, PaymentReference payment);
}
```

`hold` must be atomic across all requested seats. Holding three seats where one is taken must reserve none of them — a partial hold leaves the user with two seats and no film.

```java
public BookingResult book(ShowId show, List<SeatId> seats, Customer customer) {
    Hold hold = inventory.hold(show, seats, Duration.ofMinutes(10))
        .orElseThrow(() -> new SeatsUnavailable(seats));

    try {
        Money price = pricing.quote(show, seats, customer);
        PaymentReference payment = payments.charge(customer.method(), price);   // slow, no lock held
        return BookingResult.confirmed(inventory.confirm(hold.id(), payment));
    } catch (PaymentDeclined e) {
        inventory.release(hold.id());
        return BookingResult.declined(e.reason());
    } catch (GatewayTimeout e) {
        // Outcome unknown. Do NOT release - the charge may have succeeded.
        bookings.markPendingReconciliation(hold.id(), e.idempotencyKey());
        throw new BookingInProgress(hold.id(), e);
    }
}
```

Three branches, three different behaviours. The timeout branch is the one that separates answers: releasing the hold after a timeout can give the seats away for a charge that actually succeeded.

### Making the hold atomic

In one process, a per-show lock is enough:

```java
private final ConcurrentHashMap<ShowId, Object> showLocks = new ConcurrentHashMap<>();

public Optional<Hold> hold(ShowId show, List<SeatId> seats, Duration ttl) {
    Object lock = showLocks.computeIfAbsent(show, s -> new Object());
    synchronized (lock) {                          // per show, so other films never contend
        if (!allAvailable(show, seats)) return Optional.empty();
        markHeld(show, seats, ttl);
        return Optional.of(new Hold(HoldId.random(), show, seats, clock.instant().plus(ttl)));
    }
}
```

Across instances the lock does nothing, and the database has to enforce it:

```sql
UPDATE show_seats
   SET status = 'HELD', hold_id = ?, hold_expires_at = ?
 WHERE show_id = ? AND seat_id IN (?, ?, ?)
   AND (status = 'AVAILABLE'
        OR (status = 'HELD' AND hold_expires_at < now()))
```

Then check the updated row count. If it does not equal the number of seats requested, roll back the transaction — somebody else won at least one seat. The `hold_expires_at < now()` clause means an expired hold is reclaimed lazily by the next person who wants the seat, which removes the need for a sweeper to be timely.

### Expiry: lazy plus a sweeper

Lazy reclamation keeps correctness. A background job that releases expired holds keeps the seat map accurate for people browsing. You want both, and saying why you want both is the complete answer.""",
            ),
            (
                "Example",
                """Two users, one seat, narrated.

Both load the seat map for show S and see A12 available. User X submits a hold for A12 first. The conditional update matches one row — status AVAILABLE — and sets it to HELD with a ten-minute expiry. One row updated, requested one, so the hold succeeds.

User Y submits a hold for A12 two hundred milliseconds later. The same update matches zero rows, because the status is now HELD and the expiry is in the future. Zero updated against one requested, so the transaction rolls back and Y gets `SeatsUnavailable` with a refreshed seat map. No payment was attempted by Y at all.

X's payment then declines. The hold is released, A12 returns to AVAILABLE, and Y can retry successfully.

The third case: X's payment gateway times out. The hold is **not** released, because the charge may have succeeded. The booking is marked pending, a reconciliation job queries the gateway by idempotency key, and either confirms the booking or releases the hold once the outcome is known. Saying this out loud is the difference between a good answer and a complete one.""",
            ),
            (
                "Trade-offs",
                """- **Hold window length.** Short windows free seats quickly and frustrate slow payers; long windows hold inventory hostage. Ten minutes is the usual compromise.
- **Pessimistic hold versus optimistic booking.** Holding reserves inventory and can waste it; optimistic booking never wastes but fails after the user has paid, which is much worse.
- **Lazy expiry versus a sweeper.** Lazy is always correct and leaves stale seat maps; a sweeper keeps the display fresh and adds a moving part. Do both.
- **Row-per-show-seat versus a bitmap per show.** Rows are simple and queryable; a bitmap is compact and fast for the seat map and awkward for per-seat metadata.""",
            ),
            (
                "Common Mistakes",
                """- Check-then-book with no hold, so two users can both pay for one seat
- Holding a lock or a transaction open across the payment call
- Releasing the hold after a gateway timeout, when the charge may have succeeded
- Partial holds — reserving the available seats out of a requested group
- Availability modelled on the seat rather than on the show seat
- Relying solely on a sweeper for expiry, so a late sweeper blocks a sale""",
            ),
            (
                "Evolution Under Pressure",
                """**"A blockbuster opens: ten thousand people want the same show."** Contention concentrates on one show's rows. Shard by show so writes spread across partitions, serve the seat map from a cache with a short TTL, and accept that the map is slightly stale — the conditional update is the authority, the map is a hint.

**"Users want adjacent seats."** Seat selection becomes an allocation strategy over the seat map — best-fit contiguous runs of the requested size — and it belongs behind an interface so "two pairs" or "aisle preferred" are new implementations.

**"Cancellations and refunds."** Cancellation returns the show seats to AVAILABLE and issues a refund, which is a compensating action rather than an undo. A policy decides the refund amount by how close to showtime it is.

**"Dynamic pricing."** Already a `PricingPolicy` on the show. Demand-based pricing is a new implementation; the price is quoted at hold time and frozen for the hold window, or users see the price change while paying.

**"How do you test the race?"** Two threads calling `hold` for the same seat with a latch to align them, asserting exactly one succeeds. Against the database, run the same test with two connections — that is the only way to verify the conditional update.""",
            ),
            (
                "Interviewer Follow-up Questions",
                """**"How do you prevent double-booking?"** A conditional atomic update that transitions seats from AVAILABLE to HELD and checks the affected row count. No read-then-write, and no lock held across payment.

**"How long do you hold seats, and what releases them?"** A fixed window — ten minutes — with lazy reclamation in the hold query plus a background sweeper so the displayed seat map stays accurate.

**"What if the payment gateway times out?"** The outcome is unknown, so the hold stays and the booking becomes pending. Reconciliation resolves it by idempotency key. Releasing immediately risks selling a seat that was actually paid for.

**"Why is availability on the show and not the seat?"** Because a seat is physical and permanent while availability is per screening. The same seat is free for the evening show and sold for the matinee.

**"Ten thousand concurrent users on one show?"** Shard by show, cache the seat map with a short TTL and treat it as a hint, and let the conditional update be the only authority.""",
            ),
            (
                "Interview Tip",
                """Name the hold pattern immediately and say why you are not locking across payment.

> "The core of this is a temporary hold. I take the seats atomically with a conditional update from AVAILABLE to HELD with a ten-minute expiry, then call the payment gateway with no lock held, then confirm. If payment declines I release; if it times out I deliberately do not release, because the charge may have gone through and giving those seats away would be worse than holding them for another ten minutes."

That covers the race, the I/O rule and the ambiguous-failure case in one paragraph.""",
            ),
        ],
        [
            "A temporary hold with an expiry is the pattern; never lock across the payment call.",
            "Take seats with one conditional update and verify the affected row count.",
            "A hold must be all-or-nothing across the requested seats.",
            "After a gateway timeout, keep the hold and reconcile — do not release.",
            "Availability belongs to the show seat, not to the physical seat.",
        ],
        [
            "How do you stop two users booking the same seat?",
            "What releases a hold, and how quickly?",
            "What do you do when the payment gateway times out?",
            "How does this behave when ten thousand users want one show?",
        ],
    )


def _filesystem_topic() -> dict:
    return _case(
        "in-memory-filesystem",
        "Practice: In-Memory File System",
        "A composite-tree problem with path resolution, and a favourite machine-coding round.",
        "Directories, files, paths and search — the cleanest use of the composite pattern in the interview canon.",
        "MEDIUM",
        29,
        13,
        "Designing an in-memory file system is the composite pattern with a path parser attached. It appears constantly as a machine-coding exercise because it is small enough to implement in forty minutes and has enough edge cases — trailing slashes, dot segments, the root — to separate careful candidates from hasty ones.",
        [
            (
                "Why It Matters",
                """The structure is a tree where directories contain directories and files. Every operation — size, search, listing, delete — is a traversal, and if directories and files share an interface those traversals need no type checks.

The part that catches people is **path resolution**. `/a/b/../c`, `//a//b`, a trailing slash, `.` segments, and the root itself all have to work. Candidates who parse paths ad hoc inside each operation end up with the same bug five times; candidates who write one resolver get all operations right at once.

Interviewers also use this to probe concurrency in a way that is genuinely hard: two threads creating `/a/b/c` where neither `/a` nor `/a/b` exists.""",
            ),
            (
                "Requirements & Scope",
                """**Functional**

- `mkdir(path)` creating intermediate directories as needed.
- `addFile(path, content)` and `readFile(path)`.
- `ls(path)` returning sorted names, or the file name if the path is a file.
- `delete(path)` recursively.
- `find(pattern)` searching the tree.

**Out of scope:** permissions, symlinks, hard links, mmap, persistence — unless the interviewer adds them, and symlinks are the interesting one because they turn the tree into a graph.

**Assumptions**

- Absolute paths only, `/` separated.
- Names are unique within a directory.
- Single file system instance, possibly used by several threads.""",
            ),
            (
                "How It Works",
                """### The composite

```java
public sealed interface FsNode permits FsFile, FsDirectory {
    String name();
    long sizeBytes();
    Instant modifiedAt();
}

public final class FsFile implements FsNode {
    private final String name;
    private StringBuilder content;

    public long sizeBytes() { return content.length(); }
    public void append(String text) { content.append(text); }
    public String read() { return content.toString(); }
}

public final class FsDirectory implements FsNode {
    private final String name;
    private final Map<String, FsNode> children = new TreeMap<>();   // sorted for ls

    public long sizeBytes() {
        return children.values().stream().mapToLong(FsNode::sizeBytes).sum();
    }

    public Optional<FsNode> child(String name) { return Optional.ofNullable(children.get(name)); }
    public void put(FsNode node) { children.put(node.name(), node); }
    public void remove(String name) { children.remove(name); }
    public List<String> names() { return List.copyOf(children.keySet()); }
}
```

`TreeMap` gives sorted `ls` for free. `sizeBytes` is recursive on directories and terminal on files, with no `instanceof` anywhere — which is the composite pattern paying for itself.

Note that `put` and `remove` live only on `FsDirectory`, not on `FsNode`. That is the safe variant: a file can never be asked to accept a child.

### One path resolver, used by everything

```java
public final class PathResolver {
    public static List<String> segments(String path) {
        if (!path.startsWith("/")) throw new IllegalArgumentException("absolute paths only");
        Deque<String> stack = new ArrayDeque<>();
        for (String part : path.split("/")) {
            if (part.isEmpty() || part.equals(".")) continue;        // handles // and /./ and trailing /
            if (part.equals("..")) { stack.pollLast(); continue; }   // pollLast at root is a no-op
            stack.addLast(part);
        }
        return List.copyOf(stack);
    }
}
```

Five lines of loop body, and it handles every edge case: `//a//b` collapses, `/a/./b` drops the dot, `/a/b/..` becomes `/a`, `/..` stays at root, and `/` returns an empty list meaning the root itself.

Writing this once is the single highest-value decision in the problem. Every operation then starts by resolving segments and walking.

### Operations

```java
public final class FileSystem {
    private final FsDirectory root = new FsDirectory("");

    public void mkdir(String path) {
        FsDirectory current = root;
        for (String segment : PathResolver.segments(path)) {
            FsNode next = current.child(segment).orElse(null);
            if (next == null) {
                FsDirectory created = new FsDirectory(segment);
                current.put(created);
                current = created;
            } else if (next instanceof FsDirectory directory) {
                current = directory;
            } else {
                throw new NotADirectory(segment);        // a file is in the way
            }
        }
    }

    public List<String> ls(String path) {
        FsNode node = resolve(path);
        if (node instanceof FsFile file) return List.of(file.name());   // ls on a file: its own name
        return ((FsDirectory) node).names();
    }
}
```

`ls` on a file returning that file's name is a real POSIX behaviour and a detail interviewers check.

### Search

```java
public List<String> find(String glob) {
    List<String> matches = new ArrayList<>();
    walk(root, "", Pattern.compile(globToRegex(glob)), matches);
    return matches;
}

private void walk(FsDirectory dir, String prefix, Pattern pattern, List<String> out) {
    for (FsNode child : dir.childrenInOrder()) {
        String path = prefix + "/" + child.name();
        if (pattern.matcher(child.name()).matches()) out.add(path);
        if (child instanceof FsDirectory directory) walk(directory, path, pattern, out);
    }
}
```

Recursion is fine for interview depths. For a user-controlled tree, convert to an explicit stack so a pathological depth cannot blow the JVM stack — worth saying even if you do not write it.""",
            ),
            (
                "Example",
                """A short session, including the traps.

`mkdir("/a/b/c")` — segments are [a, b, c]. None exist, so three directories are created in a chain. Intermediate creation is implicit, which is the `mkdir -p` behaviour interviewers expect.

`addFile("/a/b/file.txt", "hello")` — resolves [a, b], finds the directory, puts a file. `ls("/a/b")` returns `[c, file.txt]` sorted by the `TreeMap`.

`ls("/a/b/file.txt")` returns `[file.txt]` — the file's own name, not its contents.

`sizeBytes` on `/a` recurses to 5, the length of the file content, with no type check in the caller.

Now the edge cases: `mkdir("/a//b/./c/")` resolves to exactly the same [a, b, c] and is therefore idempotent. `ls("/a/b/../..")` resolves to [] — the root. And `mkdir("/a/b/file.txt/d")` throws `NotADirectory`, because a file is in the way, which is the case a careless implementation silently corrupts.""",
            ),
            (
                "Trade-offs",
                """- **`TreeMap` versus `HashMap` for children.** `TreeMap` gives sorted `ls` at O(log n) per lookup; `HashMap` is O(1) and requires sorting on each listing. For `ls`-heavy use, `TreeMap` wins.
- **Recursive versus iterative traversal.** Recursion reads better; iteration survives adversarial depth.
- **Storing size versus computing it.** Computing is always correct and O(subtree); caching makes `du` instant and requires invalidating up the parent chain on every write.
- **Content as `StringBuilder` versus bytes.** A builder is convenient for an interview and wrong for binary files; say so if asked.""",
            ),
            (
                "Common Mistakes",
                """- Parsing paths inline in every method, so each one has its own edge-case bugs
- Mishandling `//`, trailing slashes, `.` or `..`, especially `..` at the root
- Putting `addChild` on the node interface so files must reject it at runtime
- `ls` on a file returning its contents or throwing, instead of its name
- Silently overwriting a file when a directory is requested at the same path
- Unbounded recursion on a tree an adversary controls""",
            ),
            (
                "Evolution Under Pressure",
                """**"Two threads create `/a/b/c` simultaneously."** The race is inside `mkdir`: both see `/a` missing and both create it. Fix by making each step atomic — `children.computeIfAbsent(segment, FsDirectory::new)` on a `ConcurrentHashMap` — so exactly one wins per level and the other reuses it.

**"Add symlinks."** The tree becomes a graph and resolution can cycle. Resolve links during path walking with a hop limit — POSIX uses 40 — and return a loop error beyond it.

**"Support move and copy."** Move is a remove plus a put and must reject moving a directory into its own subtree, which is a cycle check up the parent chain. Copy is a deep recursive clone.

**"Add permissions."** A permission set per node, checked during path resolution: traversing a directory requires execute, listing requires read. The natural implementation is a protection proxy around `FileSystem` rather than checks scattered through operations.

**"Directory with a million entries."** `ls` returning a sorted `List` copies everything. Return a lazy iterator or a paged listing instead, which is also what real file systems do.

**"Snapshot the tree."** Persistent immutable nodes with structural sharing: a write creates new nodes along one path and shares the rest, so a snapshot is just holding the old root. This is a good place to mention it as the copy-on-write design without implementing it.""",
            ),
            (
                "Interviewer Follow-up Questions",
                """**"How do you handle `..` and `.`?"** One resolver that walks segments into a deque: `.` and empty segments are skipped, `..` pops, and popping at the root is a no-op. Every operation uses it, so the behaviour is consistent.

**"Why do directories and files share an interface?"** So traversal needs no type checks — `sizeBytes` and search are the same call at every level. That is the composite pattern.

**"Where do `addChild` and `remove` live?"** Only on the directory. Putting them on the node interface forces files to throw, which is a Liskov violation.

**"How do you make `mkdir -p` thread-safe?"** Make each level atomic with `computeIfAbsent` on a concurrent map, so concurrent creators converge on the same node rather than overwriting each other.

**"How would you add symlinks safely?"** Resolve them during the walk with a hop limit, so a symlink cycle produces an error rather than an infinite loop.""",
            ),
            (
                "Interview Tip",
                """Write the path resolver first and say why. It is a two-minute investment that eliminates most of the bugs in the rest of the exercise.

> "Before any operation I want one path resolver that turns a string into a list of segments, handling empty segments from double slashes, `.`, `..` and `..` at the root. Every method starts by calling it, so trailing slashes and dot segments behave the same everywhere instead of each operation having its own bugs. Then directories and files share an `FsNode` interface so size and search recurse without type checks."

Two decisions, both of which pay off in every subsequent method.""",
            ),
        ],
        [
            "One path resolver used by every operation eliminates repeated edge-case bugs.",
            "Directories and files share an interface so traversals need no type checks.",
            "Child mutation belongs on the directory, never on the node interface.",
            "computeIfAbsent per level makes concurrent mkdir -p converge instead of clobbering.",
            "Symlinks turn the tree into a graph — resolve with a hop limit.",
        ],
        [
            "How do you resolve paths containing dot and dot-dot segments?",
            "Why should directories and files share an interface?",
            "How do you make recursive directory creation thread-safe?",
            "What changes if you add symbolic links?",
        ],
    )


def _lru_cache_topic() -> dict:
    return _case(
        "lru-cache-design",
        "Practice: LRU Cache & Eviction",
        "The O(1) cache design, and the eviction, expiry and stampede questions that follow it.",
        "HashMap plus doubly linked list, then TTL, thread safety and the cache stampede.",
        "MEDIUM",
        30,
        13,
        "An LRU cache is asked as a coding problem and as a design problem, and the design version is more interesting. The data structure is a known answer — a map plus a doubly linked list — so the signal is in what comes next: pluggable eviction, expiry, concurrency, and what happens when a thousand requests miss the same key at once.",
        [
            (
                "Why It Matters",
                """The core requirement is O(1) `get` and `put` with eviction of the least recently used entry. No single structure does both: a map gives O(1) lookup and no ordering; a list gives ordering and O(n) lookup. Combining them is the classic answer.

As a design question, the depth is elsewhere. Eviction policy should be pluggable — LRU, LFU, FIFO and TTL-first are the same interface. Expiry interacts with eviction in a way people get wrong. And the stampede question — many concurrent misses on one hot key — is the one that reveals whether you have run a cache in production.""",
            ),
            (
                "Requirements & Scope",
                """**Functional**

- `get(key)` and `put(key, value)` in O(1).
- Bounded capacity with eviction when full.
- Optional per-entry TTL.
- Report hits, misses and evictions.

**Out of scope:** distribution, persistence, serialisation — until the interviewer adds them, and they will.

**Assumptions**

- Single process to begin with.
- Values are immutable or treated as such, so a returned value cannot corrupt the cache.
- Capacity is by entry count; by memory footprint is a harder variant worth mentioning.""",
            ),
            (
                "How It Works",
                """### The structure

```java
public final class LruCache<K, V> {
    private static final class Node<K, V> {
        K key; V value; Node<K, V> prev, next;
        Instant expiresAt;
    }

    private final Map<K, Node<K, V>> index = new HashMap<>();
    private final Node<K, V> head = new Node<>();      // sentinel: most recently used side
    private final Node<K, V> tail = new Node<>();      // sentinel: eviction side
    private final int capacity;

    public LruCache(int capacity) {
        this.capacity = capacity;
        head.next = tail;
        tail.prev = head;
    }

    public Optional<V> get(K key) {
        Node<K, V> node = index.get(key);
        if (node == null) return Optional.empty();
        if (isExpired(node)) { unlink(node); index.remove(key); return Optional.empty(); }
        moveToFront(node);
        return Optional.of(node.value);
    }

    public void put(K key, V value, Duration ttl) {
        Node<K, V> existing = index.get(key);
        if (existing != null) {
            existing.value = value;
            existing.expiresAt = clock.instant().plus(ttl);
            moveToFront(existing);
            return;
        }
        if (index.size() == capacity) evictLeastRecentlyUsed();
        Node<K, V> fresh = newNode(key, value, ttl);
        index.put(key, fresh);
        pushFront(fresh);
    }

    private void evictLeastRecentlyUsed() {
        Node<K, V> victim = tail.prev;
        unlink(victim);
        index.remove(victim.key);
    }
}
```

Two details worth stating. **Sentinel head and tail nodes** remove every null check from unlink and insert, which is where hand-written linked lists usually break. And **`get` counts as a use** — forgetting to move the node on a read is the most common bug, and it silently turns LRU into FIFO.

### Making eviction pluggable

```java
public interface EvictionPolicy<K> {
    void recordAccess(K key);
    void recordInsert(K key);
    K selectVictim();
    void remove(K key);
}
```

LRU is the linked list above. LFU keeps a frequency count with a bucket per frequency — the same structure as the max-frequency stack. FIFO ignores access entirely. Segmented LRU protects recently admitted entries from a scan.

Putting eviction behind an interface means "now use LFU" is a new class, and it is the reason to mention the policy interface unprompted.

### Expiry interacts with eviction

An expired entry is not the same as an evicted one. Two mechanisms, and you want both:

- **Lazy:** check expiry on `get` and drop it there. Always correct, and an expired entry that is never read occupies capacity forever.
- **Active:** a periodic sweep, or a min-heap keyed by expiry so the soonest-expiring entry is at the root.

The interaction matters: **prefer evicting an already-expired entry over a live LRU victim.** A cache that evicts a fresh entry while holding an expired one is wasting capacity, and noticing that is a good sign.

### The stampede

A thousand concurrent requests miss the same hot key. Without protection, a thousand loader calls hit the backend simultaneously — which is how a cache restart takes down a database.

```java
private final ConcurrentHashMap<K, CompletableFuture<V>> inFlight = new ConcurrentHashMap<>();

public V getOrLoad(K key, Function<K, V> loader) {
    Optional<V> cached = get(key);
    if (cached.isPresent()) return cached.get();

    CompletableFuture<V> future = inFlight.computeIfAbsent(key, k ->
        CompletableFuture.supplyAsync(() -> loader.apply(k)));
    try {
        V value = future.join();
        put(key, value, defaultTtl);
        return value;
    } finally {
        inFlight.remove(key, future);
    }
}
```

Cache the **in-flight future**, not just the value. The first caller starts the load; the other nine hundred and ninety-nine join the same future. One backend call instead of a thousand.""",
            ),
            (
                "Example",
                """Capacity 3, walking the list state.

`put(A)`, `put(B)`, `put(C)` — list is head, C, B, A, tail. A is the eviction candidate.

`get(A)` — A is found and moved to the front. List is head, A, C, B, tail. B is now the candidate. This is the step people forget: a read changed the eviction order.

`put(D)` — at capacity, so evict `tail.prev`, which is B. List becomes head, D, A, C, tail.

`get(B)` — miss, because B was evicted.

Now with TTL. `put(E, ttl=1s)` and the clock advances two seconds. `get(E)` finds the node, sees it is expired, unlinks it, removes it from the index and reports a miss. The entry is gone without a sweeper having run — which is why lazy expiry is the correctness mechanism and the sweeper is only an optimisation.

And the stampede: ten threads call `getOrLoad(F)` simultaneously on an empty cache. `computeIfAbsent` guarantees one future, so the loader runs once and the other nine block on `join`.""",
            ),
            (
                "Trade-offs",
                """- **`LinkedHashMap` with access order is five lines and non-pluggable.** Good for a quick answer, and interviewers usually want the hand-rolled version.
- **Lazy versus active expiry.** Lazy is correct and lets dead entries occupy capacity; active keeps memory tight and adds a background thread.
- **Entry-count versus memory-size capacity.** Counting entries is simple and wrong when values vary wildly in size; measuring size is accurate and requires a sizing function.
- **Coarse lock versus segmentation.** One lock is simple and contended; striping across segments scales and makes a strict global LRU impossible, which is why real caches use approximate LRU.""",
            ),
            (
                "Common Mistakes",
                """- Not moving a node to the front on `get`, which turns LRU into FIFO
- Hand-rolled linked list without sentinels, producing null-pointer bugs on the edges
- Evicting a live entry while an expired one is still resident
- Caching the value rather than the in-flight future, allowing a stampede
- Returning a mutable value that a caller can modify inside the cache
- An unbounded map of in-flight futures, which leaks when loads fail""",
            ),
            (
                "Evolution Under Pressure",
                """**"Make it thread-safe."** The list and the map must move together, so a single lock is correct and contended. The production answer is segmentation — partition by key hash, one lock per segment — which gives approximate LRU because ordering is only maintained within a segment. Saying "approximate LRU is what real caches do" is the right level of honesty.

**"Switch to LFU."** A new `EvictionPolicy`. The structure is a frequency map plus a bucket list per frequency, evicting from the lowest non-empty bucket — O(1), same as LRU.

**"Add a maximum memory size."** Capacity becomes a weigher function over entries and eviction loops until the total fits. One large value can now evict several small ones.

**"Six machines should share the cache."** In-process caching becomes a client of a shared store. Either a distributed cache such as Redis, or consistent hashing so each key has a home node. Local plus remote — a near cache — reduces latency and introduces an invalidation problem.

**"How do you invalidate?"** TTL is the simplest and is eventually consistent. Explicit invalidation on write is precise and needs a broadcast across instances. Versioned keys sidestep invalidation entirely by making new data a new key.

**"A key is requested ten thousand times a second and always misses."** That is either a stampede — solved by the in-flight future — or a genuinely uncacheable key, in which case a negative cache with a short TTL stops the backend being hammered for something that does not exist.""",
            ),
            (
                "Interviewer Follow-up Questions",
                """**"How do you get O(1) for both operations?"** A hash map for lookup and a doubly linked list for recency. The map stores node references so unlinking is O(1), and sentinels remove the edge cases.

**"Does `get` change the eviction order?"** Yes — it must. A read is a use, so the node moves to the front. Forgetting this makes it a FIFO cache with an LRU name.

**"How do TTL and eviction interact?"** Lazily on read for correctness, a sweep or expiry heap for memory, and eviction should prefer an already-expired entry to a live LRU victim.

**"Thread safety?"** One lock is correct and contended because the map and list must stay consistent. Segmented locking scales and yields approximate LRU, which is the trade every production cache makes.

**"A thousand threads miss the same key?"** Cache the in-flight future rather than the value, so exactly one load runs and the rest join it.""",
            ),
            (
                "Interview Tip",
                """Give the structure in one sentence, then immediately volunteer the two things people get wrong.

> "Hash map from key to node for O(1) lookup, plus a doubly linked list for recency with sentinel head and tail so unlinking needs no null checks. Two things I want to get right: `get` has to move the node to the front, because a read is a use, and I will cache the in-flight future rather than the value so a thousand simultaneous misses on one key produce one backend call instead of a thousand."

The stampede point in particular marks the answer as coming from experience.""",
            ),
        ],
        [
            "Hash map plus doubly linked list with sentinels gives O(1) get, put and evict.",
            "A read is a use — move the node to the front or you have built FIFO.",
            "Lazy expiry is the correctness mechanism; a sweeper is the memory optimisation.",
            "Prefer evicting an expired entry over a live LRU victim.",
            "Cache the in-flight future to collapse a stampede into a single load.",
        ],
        [
            "How do you achieve O(1) get and put with eviction?",
            "Does a get change eviction order, and why does it matter?",
            "How do expiry and eviction interact?",
            "What happens when a thousand threads miss the same key?",
        ],
    )


def _logging_framework_topic() -> dict:
    return _case(
        "logging-framework",
        "Practice: Logging Framework",
        "Levels, appenders, formatters and async buffering — a pattern-dense design with a real backpressure question.",
        "A design that uses four patterns naturally and ends in a question about what to drop when the disk is slow.",
        "MEDIUM",
        31,
        13,
        "Designing a logging framework is unusually pattern-dense: chain of responsibility for filters, strategy for formatters, observer for appenders, and a decorator for async buffering. It is also one of the few LLD problems where the right answer includes deciding what to throw away, because a logger must never become the reason an application stalls.",
        [
            (
                "Why It Matters",
                """Two design properties make this problem interesting.

**The logger is on every hot path.** A log call that blocks on disk or network makes every request slower. So the fast path must do almost nothing: check a level, format lazily, hand off.

**It must fail safe.** If the log destination is slow or down, the application must keep serving. That means bounded buffers and an explicit drop policy — and the drop policy is the design decision interviewers are looking for, because most candidates never mention it.""",
            ),
            (
                "Requirements & Scope",
                """**Functional**

- Levels: TRACE, DEBUG, INFO, WARN, ERROR, with per-logger thresholds.
- Multiple destinations: console, file, remote.
- Pluggable formatting: plain text, JSON.
- Structured context — request id, user id — attached automatically.
- Asynchronous writing so application threads do not block.

**Out of scope:** log aggregation, search, retention policies.

**Assumptions**

- Many threads log concurrently.
- A destination may be slow or unavailable.
- Logging must never throw into application code.""",
            ),
            (
                "How It Works",
                """### The record is a value object

```java
public record LogRecord(
    Instant timestamp,
    Level level,
    String loggerName,
    String message,
    Object[] arguments,          // not yet formatted
    Throwable error,
    Map<String, String> context,
    String threadName) {}
```

Arguments stay unformatted. `log.debug("user {} did {}", userId, action)` must not build a string when DEBUG is disabled — and in a hot loop that saved concatenation is most of the cost of logging.

### Level check first, always

```java
public final class Logger {
    private volatile Level threshold;

    public void debug(String message, Object... arguments) {
        if (!Level.DEBUG.isAtLeast(threshold)) return;      // the cheapest possible early exit
        dispatch(new LogRecord(clock.instant(), Level.DEBUG, name, message, arguments, ...));
    }
}
```

`volatile` so a runtime level change is visible to every thread without a lock. That single word is a good interview detail.

### Appenders are observers; formatters are strategies

```java
public interface Appender {
    void append(LogRecord record);
    void flush();
}

public interface Formatter {
    String format(LogRecord record);
}

public final class FileAppender implements Appender {
    private final Formatter formatter;
    private final Writer writer;

    public void append(LogRecord record) {
        try {
            writer.write(formatter.format(record));
        } catch (IOException e) {
            // A logging failure must never propagate into application code.
            FallbackErrorReporter.report("file appender failed", e);
        }
    }
}
```

The swallowed exception is deliberate and should be narrated: an application must not crash because a log file is full. Reporting to a separate fallback channel is what stops it being a silent hole.

### Filters are a chain

```java
public interface LogFilter {
    Decision decide(LogRecord record);        // ACCEPT, DENY, NEUTRAL
}
```

Sampling filters, per-package thresholds, and rate limiting on a noisy logger all compose in a chain. Rate limiting here is worth calling out: one exception in a tight loop can produce a million identical lines, and a filter that collapses duplicates is what stops a log flood becoming an outage.

### Asynchrony is a decorator with a bounded queue

```java
public final class AsyncAppender implements Appender {
    private final Appender delegate;
    private final BlockingQueue<LogRecord> queue;
    private final DropPolicy dropPolicy;
    private final Thread worker;

    public void append(LogRecord record) {
        if (!queue.offer(record)) {            // bounded: full means a decision is required
            dropPolicy.onFull(record, queue);
        }
    }
}
```

The `DropPolicy` is the interesting interface:

- **Drop the new record** — simple, loses the most recent events, which are usually the interesting ones.
- **Drop the oldest** — keeps recent context, loses history.
- **Drop by level** — discard DEBUG and INFO, always keep WARN and ERROR. Usually the right answer.
- **Block the caller** — preserves everything and makes logging able to stall the application. Almost never right.

Naming these four and picking level-based dropping is the strongest answer to "what happens when the disk is slow?"

### Shutdown must flush

```java
Runtime.getRuntime().addShutdownHook(new Thread(() -> {
    asyncAppender.flush();
    asyncAppender.awaitDrain(Duration.ofSeconds(5));
}));
```

The most valuable log lines are the ones written just before a crash, and an async appender loses exactly those unless shutdown drains the queue. Volunteering this is a strong signal.""",
            ),
            (
                "Example",
                """One call traced end to end.

`log.info("order {} placed by {}", orderId, userId)` from a request thread.

1. Level check: INFO passes the threshold. If it had not, the method returns having allocated nothing beyond the varargs array.
2. A `LogRecord` is built with unformatted arguments and the current MDC context — request id, user id — captured from a thread local.
3. Filters run: the sampling filter is NEUTRAL, the rate limiter sees this logger is under its per-second budget and returns NEUTRAL, so the record proceeds.
4. The record is offered to the async queue. It has space, so the application thread returns immediately — total cost is a few allocations and an enqueue.
5. The worker thread dequeues it, the JSON formatter renders it, and the file appender writes it.

Now the failure. The disk stalls and the queue fills. `offer` returns false. The level-based drop policy discards the INFO record and increments a `logs_dropped` counter — which is itself worth exposing as a metric, because silently dropping logs and not knowing is worse than dropping them.

An ERROR arriving in the same state is not dropped: the policy evicts the oldest DEBUG record instead.""",
            ),
            (
                "Trade-offs",
                """- **Async versus sync.** Async keeps the hot path fast and can lose records on a crash. Sync is durable and makes logging a latency contributor.
- **Bounded versus unbounded queue.** Bounded forces a drop policy; unbounded turns a slow disk into an out-of-memory error.
- **Per-record formatting versus batching.** Batching writes amortises I/O and delays visibility.
- **Structured versus plain text.** JSON is machine-queryable and larger; text is human-readable and awkward to parse. Most production systems choose structured.
- **Thread-local context.** Automatic and invisible, and it leaks across pooled threads unless cleared — a real production bug worth mentioning.""",
            ),
            (
                "Common Mistakes",
                """- Formatting the message before checking the level
- Letting an appender exception propagate into application code
- An unbounded queue in the async appender
- No drop policy, so the behaviour under pressure is accidental
- Losing buffered records at shutdown because nothing flushes
- Forgetting to clear thread-local context when a pooled thread is reused, leaking one request's ids into another's logs""",
            ),
            (
                "Evolution Under Pressure",
                """**"The disk fills up."** The appender's write fails. It reports through the fallback channel, the queue backs up, the drop policy sheds low-level records, and a metric records the loss. The application keeps serving.

**"One exception logs a million times."** A rate-limiting filter keyed by message template and stack signature: log the first N per interval and then a summary line — "suppressed 998,412 similar events". This turns a log flood into one useful line.

**"Change the level at runtime without a restart."** The threshold is `volatile`, so a management endpoint can set it and every thread sees the change immediately. This is why `volatile` rather than a plain field.

**"Ship logs to a remote collector."** A new `Appender` with retry, batching and a circuit breaker — all decorators over the network appender, so none of that logic enters the logger.

**"Logging is showing up in profiles."** Check the cheap things first: is the level check before formatting, is context capture allocating per call, is the timestamp call expensive. Then batch writes and consider a ring buffer with a lock-free producer, which is what high-throughput frameworks use.

**"How do you correlate logs across services?"** A trace id in the context, propagated through the calling convention and included in every record by the formatter — not something each call site has to remember.""",
            ),
            (
                "Interviewer Follow-up Questions",
                """**"How do you keep logging off the critical path?"** Check the level first and return before doing any work, then hand an unformatted record to a bounded queue drained by a background thread. The application thread only allocates and enqueues.

**"What happens when the queue fills?"** A drop policy decides, and I would drop by level — discard DEBUG and INFO, always keep WARN and ERROR — and expose a dropped-records metric so the loss is visible.

**"How do you avoid formatting when the level is disabled?"** Pass the template and arguments separately and format only after the level check passes. Doing string concatenation at the call site defeats this.

**"What happens to buffered records if the process dies?"** They are lost, which is the cost of async. A shutdown hook that flushes and drains recovers the graceful case; a hard kill cannot be recovered, and that trade should be stated.

**"How would you add a remote destination?"** Another `Appender`, wrapped in retry and circuit-breaker decorators. Nothing about the logger changes.""",
            ),
            (
                "Interview Tip",
                """Lead with the hot-path rule and then volunteer the drop policy. The second one is what most candidates never reach.

> "The rule I am designing around is that a log call on a request thread does almost nothing: check the level, build a record with unformatted arguments, enqueue. Everything else happens on a worker. The queue is bounded, which forces me to decide what happens when it fills — I would drop by level, keeping WARN and ERROR and shedding DEBUG and INFO, and emit a metric for dropped records so the loss is never silent."

That is the fast path, the failure mode and the observability of the failure mode in one answer.""",
            ),
        ],
        [
            "Check the level before doing any formatting work.",
            "Appenders are observers, formatters strategies, filters a chain, async a decorator.",
            "A logging failure must never propagate into application code.",
            "A bounded queue forces an explicit drop policy — drop by level and emit a metric.",
            "Flush on shutdown, or you lose exactly the lines written before a crash.",
        ],
        [
            "How do you keep logging off the request critical path?",
            "What happens when the async queue is full?",
            "How do you avoid formatting cost for disabled levels?",
            "How would you stop one repeated exception flooding the logs?",
        ],
    )


def _notification_service_topic() -> dict:
    return _case(
        "notification-service",
        "Practice: Notification Service",
        "Multi-channel delivery with preferences, retries, deduplication and templating.",
        "Email, SMS and push behind one interface, with the at-least-once delivery problems that follow.",
        "MEDIUM",
        32,
        13,
        "A notification service is the LLD problem that most directly rewards the patterns: a channel interface for polymorphism, decorators for retry and deduplication, a strategy for templating, and an event-driven boundary so a failed email cannot fail a business operation. The follow-ups are all about delivery semantics, which is where the depth is.",
        [
            (
                "Why It Matters",
                """The naive version — a `sendEmail` method called inline from the order service — fails in four ways that an interviewer will walk through: adding SMS means editing the order service, a slow SMTP server slows down checkout, a failed send either loses the notification or fails the order, and a retry sends a duplicate.

Each of those has a named answer, and together they form a complete design. What makes this problem good practice is that every follow-up is a delivery-semantics question: at-least-once, idempotency, ordering, and what "delivered" even means when the channel is a third party.""",
            ),
            (
                "Requirements & Scope",
                """**Functional**

- Send a notification to a user over one or more channels.
- Respect per-user channel preferences and quiet hours.
- Template content per notification type and locale.
- Retry transient failures; do not duplicate on retry.
- Report delivery status.

**Out of scope:** the actual SMTP and push protocols, marketing campaign management, unsubscribe compliance beyond a preference flag.

**Assumptions**

- Third-party providers are used per channel and can fail or be slow.
- Delivery is at-least-once; exactly-once is not achievable across a network boundary.
- Volume is high enough that sending must be asynchronous.""",
            ),
            (
                "How It Works",
                """### One interface, many channels

```java
public interface Channel {
    ChannelType type();
    DeliveryResult send(Recipient recipient, RenderedMessage message);
}

public record RenderedMessage(String subject, String body, Map<String, String> metadata) {}
```

`SmsChannel`, `EmailChannel` and `PushChannel` are adapters over Twilio, SES and FCM. Everything vendor-shaped stops at that boundary — the same anti-corruption argument as the adapter lesson.

### Preferences decide the channels

```java
public interface PreferenceService {
    List<ChannelType> channelsFor(UserId user, NotificationType type);
    boolean isInQuietHours(UserId user, Instant now);
}
```

Preferences are a query, not a rule embedded in the sender. Quiet hours are worth modelling explicitly: a transactional notification such as a security alert overrides them, a marketing one does not, so the notification type carries an urgency.

### Templating is a strategy

```java
public interface TemplateEngine {
    RenderedMessage render(NotificationType type, ChannelType channel, Locale locale,
                           Map<String, Object> variables);
}
```

The same `OrderShipped` notification renders differently for email (subject plus HTML) and SMS (160 characters, no subject). Channel is part of the lookup key, which is the detail candidates miss.

### The pipeline is decorators

```java
Channel sms = new DeduplicatingChannel(
                  new RetryingChannel(
                      new MeteredChannel(
                          new TwilioSmsChannel(twilio), metrics),
                      3, backoff),
                  deliveredIds);
```

Order matters and is worth narrating. **Deduplication is outside retry**: a retry must be allowed to resend the same message, while a genuinely duplicate request must not be sent at all. Inverting them makes retries silent no-ops — a bug that only shows up under failure, which is exactly when you need retries to work.

### Asynchronous by default

```java
public final class NotificationDispatcher {
    private final BlockingQueue<NotificationRequest> queue;   // bounded

    public Ack submit(NotificationRequest request) {
        NotificationId id = NotificationId.random();
        outbox.record(id, request, Status.PENDING);           // durable before acking
        if (!queue.offer(request.withId(id))) {
            return Ack.queuedForLater(id);                    // the outbox will pick it up
        }
        return Ack.accepted(id);
    }
}
```

Recording to the outbox before acknowledging is what makes the service durable. A process crash loses the in-memory queue, and a relay job picks pending rows back up. That is the outbox pattern, and naming it is worth doing.

### Idempotency is the key mechanism

```java
public record NotificationRequest(
    UserId user,
    NotificationType type,
    Map<String, Object> variables,
    IdempotencyKey key) {}         // caller-supplied, stable per logical event
```

At-least-once delivery means the same request can arrive twice. A caller-supplied key — typically derived from the triggering event, such as `order-9912-shipped` — lets the deduplicating decorator drop the second one. Generating the key inside the service defeats the purpose, because a retried caller would generate a new one.""",
            ),
            (
                "Example",
                """An order ships, traced through the whole path.

`OrderShipped` is published by the order service. A listener builds a `NotificationRequest` with type `ORDER_SHIPPED`, variables containing the order id and tracking number, and idempotency key `order-9912-shipped`. Nothing about the order service knows what a channel is.

The dispatcher records the request in the outbox as PENDING and enqueues it. The order service's transaction is already committed; a notification failure cannot affect it.

A worker dequeues. Preferences say this user wants email and push, and it is 2am in their timezone — but `ORDER_SHIPPED` is transactional, so quiet hours do not apply. The template engine renders once per channel: an HTML email with a subject, a short push payload with a deep link.

The email channel's deduplicating decorator checks the key plus channel, sees no prior delivery, and passes through. The retrying decorator calls SES; it times out. Retry two succeeds. The outbox row moves to SENT.

Now the duplicate. The order service redelivers `OrderShipped` because its own consumer offsets were not committed. A second `NotificationRequest` arrives with the same key. The deduplicating decorator finds the key already delivered for email and drops it. The user gets one email, not two — which is the entire reason the key exists.""",
            ),
            (
                "Trade-offs",
                """- **At-least-once versus at-most-once.** At-least-once plus idempotency means occasional duplicate work and no lost notifications; at-most-once loses some and never duplicates. For a shipping email, at-least-once is right; for a payment alert, definitely.
- **Fan-out on send versus per-channel jobs.** One job sending to three channels is simpler and couples their failures; a job per channel isolates failures and multiplies bookkeeping.
- **Dedup window.** Storing every key forever is precise and unbounded; a TTL bounds memory and allows a duplicate after the window.
- **Ordering.** Guaranteeing that two notifications arrive in order requires per-user serialisation, which costs throughput. Most systems do not, and should say so.""",
            ),
            (
                "Common Mistakes",
                """- Calling the notifier inline from the business transaction, so an SMTP outage blocks orders
- Deduplication inside retry, which turns every retry into a no-op
- Generating the idempotency key inside the service instead of accepting it from the caller
- One template per notification type, ignoring that SMS and email need different renderings
- Unbounded retry with no backoff, which amplifies an outage
- Treating a provider's 200 response as proof of delivery rather than of acceptance""",
            ),
            (
                "Evolution Under Pressure",
                """**"The SMS provider is down for an hour."** The retry decorator exhausts its attempts and the request moves to a dead-letter store with its failure reason. A circuit breaker around the channel stops hammering a dead provider, and a replay job drains the dead-letter queue once the breaker closes.

**"Ten million notifications for a marketing campaign."** Separate the transactional and bulk paths entirely: different queues, different priorities, and rate limiting per provider. A campaign must never delay a password reset.

**"Users complain about duplicates."** Check the dedup key: is it stable across retries, and is the window long enough? A key derived from a timestamp is the usual bug.

**"Add a new channel — WhatsApp."** A new `Channel` implementation, templates for it, and a preference option. Nothing else changes, which is the point of the interface.

**"How do you know a notification was delivered?"** Provider acceptance is not delivery. Webhooks from the provider update the status asynchronously, so the model needs SENT, DELIVERED, BOUNCED and FAILED as distinct states — a state machine, not a boolean.

**"Quiet hours across timezones."** Store the user's timezone, not an offset, and evaluate quiet hours in their local time. Transactional notifications bypass; marketing ones are deferred to the next allowed window, which means the queue needs scheduled delivery.""",
            ),
            (
                "Interviewer Follow-up Questions",
                """**"How do you avoid sending duplicates?"** A caller-supplied idempotency key derived from the triggering event, checked in a deduplicating decorator that sits outside retry so retries still work.

**"Why is deduplication outside retry?"** Because a retry is a legitimate resend of the same message. If dedup were innermost, the first attempt would record the key and every retry would be dropped, so a transient failure would become a permanent loss.

**"What if the notification service crashes after accepting a request?"** The request was written to the outbox before acknowledging, so a relay job picks up PENDING rows after restart. Losing only the in-memory queue is recoverable.

**"Is a provider's success response delivery confirmation?"** No — it is acceptance. Real delivery status arrives later by webhook, which is why status is a state machine including DELIVERED and BOUNCED.

**"How do you stop a marketing blast delaying a password reset?"** Separate queues with separate priorities and per-provider rate limits, so bulk traffic cannot occupy the transactional path.""",
            ),
            (
                "Interview Tip",
                """Open by moving notification out of the business transaction, then name the two delivery mechanisms.

> "First, the order service should publish an event rather than call a notifier — an SMTP outage must not be able to fail a shipment. Then delivery is at-least-once, which means the caller supplies an idempotency key derived from the event, and the deduplicating decorator sits outside the retry decorator so retries still resend but genuine duplicates are dropped."

Two sentences that cover coupling, delivery semantics and a wrapping-order bug most candidates never mention.""",
            ),
        ],
        [
            "Publish an event rather than calling the notifier inside a business transaction.",
            "At-least-once plus a caller-supplied idempotency key is the practical delivery model.",
            "Deduplication must wrap outside retry, or every retry becomes a no-op.",
            "Write to an outbox before acknowledging so a crash is recoverable.",
            "Provider acceptance is not delivery — status is a state machine fed by webhooks.",
        ],
        [
            "How do you prevent duplicate notifications?",
            "Why does deduplication go outside the retry wrapper?",
            "What happens if the service crashes after accepting a request?",
            "How do you keep a bulk campaign from delaying transactional messages?",
        ],
    )


def _text_editor_topic() -> dict:
    return _case(
        "text-editor-undo",
        "Practice: Text Editor with Undo",
        "Command objects, a document buffer, and the memory question that decides the design.",
        "Insert, delete, undo and redo — plus the data structure question hiding behind a naive string.",
        "MEDIUM",
        33,
        13,
        "A text editor is two problems wearing one prompt: the command history that makes undo work, and the buffer structure that makes editing efficient. Candidates usually get the first and miss the second, and the interviewer's \"now the document is ten megabytes\" is aimed precisely at the gap.",
        [
            (
                "Why It Matters",
                """Undo forces you to answer a question most designs avoid: what exactly do you need to store to reverse an action? Insert is easy — you know the position and length. Delete is not, unless you captured the removed text before removing it.

The second problem is the buffer. A `String` makes every insertion O(n) because the whole thing is copied, and a `StringBuilder` in the middle of a large document is the same. Real editors use a gap buffer, a piece table or a rope, and knowing why is the difference between a good and a complete answer.

Both problems have a shared consequence: **the choice of buffer determines what undo can cheaply store.** A piece table makes undo almost free because edits are append-only.""",
            ),
            (
                "Requirements & Scope",
                """**Functional**

- Insert text at a position, delete a range, replace a selection.
- Unlimited-ish undo and redo with a bounded history.
- Cursor and selection tracking.
- Find and replace across the document.

**Out of scope:** syntax highlighting, rendering, collaborative editing — though the interviewer may add the last one, and it is a good place to mention operational transformation or CRDTs by name.

**Assumptions**

- Single user, single document, in memory.
- Documents can be large enough that O(n) per keystroke is unacceptable.""",
            ),
            (
                "How It Works",
                """### Commands carry their own reversal

```java
public interface EditCommand {
    void execute(Document document);
    void undo(Document document);
}

public final class InsertText implements EditCommand {
    private final int position;
    private final String text;

    public void execute(Document d) { d.insert(position, text); }
    public void undo(Document d)    { d.delete(position, text.length()); }
}

public final class DeleteRange implements EditCommand {
    private final int start;
    private final int length;
    private String removed;                       // captured during execute

    public void execute(Document d) {
        removed = d.textBetween(start, start + length);      // must happen BEFORE the delete
        d.delete(start, length);
    }

    public void undo(Document d) { d.insert(start, removed); }
}
```

`DeleteRange` is the lesson: the state needed for undo is only available during `execute`. Writing `undo` first and then realising you have nothing to restore is the common path.

### History with coalescing

```java
public final class EditHistory {
    private final Deque<EditCommand> done = new ArrayDeque<>();
    private final Deque<EditCommand> undone = new ArrayDeque<>();
    private final int limit;

    public void run(EditCommand command, Document document) {
        command.execute(document);
        if (!tryCoalesce(command)) done.push(command);
        undone.clear();                               // a new edit kills the redo branch
        if (done.size() > limit) done.removeLast();
    }
}
```

**Coalescing** is what makes undo feel right to a human. Typing "hello" produces five insert commands; one Ctrl+Z should remove the whole word, not one letter. The rule is usually: merge consecutive same-type edits at adjacent positions within a short time window, and break the group on a cursor move, a space, or a pause.

Mentioning coalescing unprompted is the detail that marks experience with editors rather than with the pattern.

### The buffer is the real design question

| Structure | Insert in the middle | Memory | Notes |
| --- | --- | --- | --- |
| **String** | O(n) copy | Compact | Unusable beyond toy sizes |
| **StringBuilder** | O(n) shift | Compact | Same problem, better constants |
| **Gap buffer** | O(1) at the gap | Compact | Moving the cursor far costs O(n) — what Emacs uses |
| **Piece table** | O(pieces) | Original plus appends | Edits are append-only, so undo is nearly free |
| **Rope** | O(log n) anywhere | Higher overhead | Balanced tree of chunks; good for very large files |

**Gap buffer** keeps a gap at the cursor, so typing is O(1); the cost is moving the gap when the cursor jumps. Real typing is local, so this is usually fine.

**Piece table** stores two immutable buffers — the original file and an append-only add buffer — plus a list of pieces describing which spans to read in what order. Nothing is ever mutated or copied, which is why undo becomes "restore the previous piece list". VS Code uses this.

Naming the piece table and explaining why it makes undo cheap is the strongest thing you can say in this problem.

### Cursor and selection as a value object

```java
public record Selection(int anchor, int caret) {
    public int start() { return Math.min(anchor, caret); }
    public int end()   { return Math.max(anchor, caret); }
    public boolean isEmpty() { return anchor == caret; }
}
```

Undo should restore the selection as well as the text — that is part of what makes undo feel correct — so the command records the selection before and after.""",
            ),
            (
                "Example",
                """A short editing session.

Document is "Hello world". The user selects "world" and types "there".

That is one logical action and two commands: `DeleteRange(6, 5)` which captures "world" during execute, and `InsertText(6, "there")`. They are grouped into a `MacroCommand` so one Ctrl+Z restores "Hello world" — undoing in reverse order, insert first then delete.

The user then types " again" as six keystrokes. Coalescing merges them into one insert command because they are consecutive, adjacent and within the time window. One Ctrl+Z removes the whole word.

The user presses Ctrl+Z twice: first undo removes " again", second undo restores "world". Now they type "X". The redo stack is cleared — you cannot redo "there" after diverging — which is the behaviour every editor has and which candidates forget to implement.

Memory check: the insert commands store a short string each; the delete stores the five characters it removed. A thousand-step history is trivial. Contrast with a design that snapshots the whole document per edit — a ten-megabyte file would need ten gigabytes for that history, which is the arithmetic that justifies inverse operations over snapshots.""",
            ),
            (
                "Trade-offs",
                """- **Inverse commands versus snapshots.** Inverses are compact and need careful capture; snapshots are trivially correct and unusable for large documents. Real editors use inverses plus periodic snapshots.
- **Coalescing granularity.** Aggressive merging makes undo feel coarse; none makes it feel tedious. Word or pause boundaries are the usual compromise.
- **Gap buffer versus piece table.** Gap buffer is simpler and punishes cursor jumps; piece table is append-only, makes undo cheap and fragments over time, needing periodic compaction.
- **History bound.** Unlimited undo is a memory leak; a bound loses history a user might want. Bound by memory rather than by step count.""",
            ),
            (
                "Common Mistakes",
                """- Writing `undo` without capturing the deleted text during `execute`
- Undoing a macro command in forward rather than reverse order
- Failing to clear the redo stack when a new edit occurs after an undo
- A `String` buffer, making every keystroke O(n) on a large document
- Unbounded history
- Not restoring the cursor and selection, so undo leaves the caret somewhere surprising""",
            ),
            (
                "Evolution Under Pressure",
                """**"The document is ten megabytes."** `String` and `StringBuilder` are out. Move to a piece table: the original buffer plus an append-only add buffer plus a piece list. Edits stop copying text entirely, and undo becomes restoring a previous piece list.

**"Find and replace across the whole document."** Replace-all is one macro command containing N replacements so it is one undo step. Searching over a piece table means iterating pieces rather than a flat string, which is why an index or a flattened cache matters for repeated searches.

**"Two people edit simultaneously."** This is a different problem class. Commands become operations that must be transformed against concurrent ones — operational transformation — or replaced by a CRDT where edits commute by construction. Naming both and saying which you would choose is the right depth; implementing either is not an LLD-interview task.

**"Undo across a save and reload."** The history must be persisted alongside the document, or undo stops at the last open. Serialising commands rather than snapshots keeps that file small.

**"Very large paste."** A single insert of a megabyte is one command with a megabyte of undo data. Acceptable once, expensive if repeated — this is where bounding history by memory rather than by step count earns its keep.

**"Syntax highlighting recomputes on every keystroke."** Not an undo concern, but the answer is incremental reparsing of the changed range, which the piece table supports naturally because it knows exactly which span changed.""",
            ),
            (
                "Interviewer Follow-up Questions",
                """**"How does undo work?"** Each command captures what it needs to reverse itself during `execute` — a delete records the removed text before removing it — and a bounded stack of executed commands is the history.

**"Why not snapshot the document?"** Memory. A ten-megabyte document with a thousand-step history would need ten gigabytes. Inverse operations store bytes, not megabytes.

**"What data structure holds the text?"** Not a `String`. A gap buffer for locality of typing, or a piece table for append-only edits and cheap undo. Ropes for very large documents with edits scattered throughout.

**"Why does a piece table make undo cheap?"** Because nothing is ever mutated — edits append to a second buffer and change a list of spans. Undo restores the previous span list, which is small.

**"What happens to redo after a new edit?"** The redo stack is cleared. The history has branched, and every editor discards the abandoned branch.""",
            ),
            (
                "Interview Tip",
                """Answer the undo question and the buffer question together, because they are connected.

> "Each edit is a command that captures its own reversal during execute — a delete has to record the removed text before it deletes it. History is a bounded stack, a new edit clears redo, and consecutive keystrokes coalesce so one Ctrl+Z removes a word rather than a letter. For the buffer I would not use a `String`, because every insert is an O(n) copy — a piece table keeps edits append-only, which also makes undo nearly free since restoring is just the previous piece list."

That is the pattern, a user-visible behaviour detail, and the scaling answer in one go.""",
            ),
        ],
        [
            "A delete command must capture the removed text during execute, not during undo.",
            "Coalesce consecutive keystrokes so one undo removes a word, not a character.",
            "A new edit after an undo clears the redo stack — the branch is discarded.",
            "A String buffer makes every keystroke O(n); gap buffers and piece tables do not.",
            "A piece table makes undo cheap because edits are append-only.",
        ],
        [
            "How do you implement undo for a delete?",
            "Why not snapshot the document for each undo step?",
            "What data structure would you use for the text buffer, and why?",
            "What happens to the redo stack after a new edit?",
        ],
    )


def _meeting_scheduler_topic() -> dict:
    return _case(
        "meeting-scheduler",
        "Practice: Meeting Scheduler",
        "Interval overlap, room allocation, recurrence and timezones — a deceptively deep modelling problem.",
        "Rooms, attendees and time ranges, where recurrence and timezones are where designs break.",
        "MEDIUM",
        34,
        13,
        "Meeting scheduler starts as an interval-overlap exercise and becomes a modelling problem the moment recurrence and timezones arrive. Those two are where almost every design fails, and an interviewer who asks for \"every Tuesday at 10am\" is checking whether you store an instant or a local time with a zone.",
        [
            (
                "Why It Matters",
                """The first half is well-trodden: find a free room for a time range, detect conflicts, suggest slots. That is interval arithmetic with a good data structure.

The second half is where candidates lose the interview:

**Recurrence.** "Every Tuesday at 10am until December" is not a list of meetings and must not be stored as one — a year of weekly meetings is fifty rows that all have to change when someone edits the series. It is a rule plus a set of exceptions.

**Timezones.** A recurring 10am meeting in London is at a different UTC instant after the clocks change. Storing UTC instants for a recurring local-time event is the classic bug, and it silently moves every meeting by an hour twice a year.""",
            ),
            (
                "Requirements & Scope",
                """**Functional**

- Book a room for a time range with a set of attendees.
- Reject conflicts for the room and warn on attendee conflicts.
- Suggest the earliest slot where a room and all attendees are free.
- Support recurring meetings with exceptions.
- Cancel a single occurrence or the whole series.

**Out of scope:** video links, calendar federation, permissions beyond organiser versus attendee.

**Assumptions**

- One organisation, many rooms with capacities.
- Users have a home timezone.
- Multiple instances may serve booking requests concurrently.""",
            ),
            (
                "How It Works",
                """### Time modelled honestly

```java
// A one-off meeting happens at an absolute instant.
public record TimeRange(Instant start, Instant end) {
    public TimeRange {
        if (!end.isAfter(start)) throw new IllegalArgumentException("end must follow start");
    }

    public boolean overlaps(TimeRange other) {
        return start.isBefore(other.end) && other.start.isBefore(end);   // half-open: [start, end)
    }
}

// A recurring series is a local time plus a zone, expanded to instants on demand.
public record RecurrenceRule(
    LocalTime startLocal,
    Duration duration,
    ZoneId zone,                    // NOT an offset - offsets change with daylight saving
    Frequency frequency,            // DAILY, WEEKLY, MONTHLY
    Set<DayOfWeek> daysOfWeek,
    LocalDate until) {}
```

Two details carry most of the weight.

**Half-open intervals.** A meeting from 10:00 to 11:00 and one from 11:00 to 12:00 do not overlap. Using closed intervals makes every back-to-back booking a conflict, and it is the single most common off-by-one in this problem.

**`ZoneId`, not an offset.** `Europe/London` survives a daylight-saving change; `+00:00` does not. A weekly 10am meeting must stay at 10am local, which means the instant moves.

### Series plus exceptions, never a materialised list

```java
public final class MeetingSeries {
    private final SeriesId id;
    private final RecurrenceRule rule;
    private final Set<LocalDate> cancelledDates = new HashSet<>();
    private final Map<LocalDate, Occurrence> overrides = new HashMap<>();   // moved or edited

    public List<Occurrence> occurrencesBetween(LocalDate from, LocalDate to) {
        return rule.datesBetween(from, to).stream()
            .filter(date -> !cancelledDates.contains(date))
            .map(date -> overrides.getOrDefault(date, defaultOccurrence(date)))
            .toList();
    }
}
```

Occurrences are computed for the window being displayed, not stored. Cancelling one Tuesday adds a date to a set; moving one adds an override. Editing the series changes the rule and leaves the overrides intact — which is exactly the behaviour users expect and which a materialised list cannot provide.

### Conflict detection

For a room's bookings on one day, a sorted list plus binary search is enough:

```java
public boolean isFree(RoomId room, TimeRange range) {
    List<TimeRange> bookings = bookingsFor(room, range.start().truncatedTo(DAYS));
    int index = Collections.binarySearch(bookings, range, byStart);
    int candidate = index >= 0 ? index : -index - 2;     // the booking that could overlap
    return (candidate < 0 || !bookings.get(candidate).overlaps(range))
        && (candidate + 1 >= bookings.size() || !bookings.get(candidate + 1).overlaps(range));
}
```

Only the neighbouring bookings can overlap a sorted, non-overlapping set, so the check is O(log n) rather than a scan.

For "which rooms are free at all in this window?", an interval tree or a segment tree answers overlap queries in O(log n + k). Naming the interval tree is worth doing even if you implement the simpler version.

### Suggesting a slot

Find the earliest range where the room and every attendee is free. Merge all busy intervals across participants and walk the gaps:

```java
public Optional<TimeRange> earliestSlot(List<UserId> attendees, RoomId room,
                                        Duration length, TimeRange window) {
    List<TimeRange> busy = Stream.concat(
            attendees.stream().flatMap(a -> busyFor(a, window).stream()),
            busyFor(room, window).stream())
        .sorted(byStart).toList();

    Instant cursor = window.start();
    for (TimeRange block : merge(busy)) {
        if (Duration.between(cursor, block.start()).compareTo(length) >= 0) {
            return Optional.of(new TimeRange(cursor, cursor.plus(length)));
        }
        cursor = maxOf(cursor, block.end());
    }
    return Duration.between(cursor, window.end()).compareTo(length) >= 0
        ? Optional.of(new TimeRange(cursor, cursor.plus(length)))
        : Optional.empty();
}
```

Merge-then-walk-the-gaps is the standard interval technique and it is the same shape as merge intervals.""",
            ),
            (
                "Example",
                """A weekly meeting through a clock change, which is the case that exposes a bad model.

The organiser creates: every Tuesday, 10:00 to 11:00, `Europe/London`, until 31 December. Nothing is stored per week — one `RecurrenceRule`.

In October the clocks go back. The rule still says 10:00 local, so the October occurrence is at 09:00 UTC and the November one is at 10:00 UTC. Both display as 10am to a London attendee, which is correct. A design storing UTC instants would show 09:00 or 11:00 to half the participants after the change.

A New York attendee sees 5am before the change and 5am after, because the US and UK change on different dates — for two weeks they see 6am. That is genuinely correct behaviour, and being able to explain why is the payoff of storing a zone.

Now the exceptions. The organiser cancels 5 November: a date is added to `cancelledDates` and the occurrence stops being generated. They move 12 November to 14:00: an override is stored for that date. They then edit the series to 10:30: the rule changes, the 5 November cancellation still holds, and the 12 November override still says 14:00 — because overrides are keyed by date and independent of the rule.

Every one of those behaviours falls out of the model rather than being special-cased.""",
            ),
            (
                "Trade-offs",
                """- **Computed occurrences versus materialised rows.** Computing keeps edits cheap and makes querying "all meetings in this room next week" require expanding every series. Materialising makes queries trivial and edits expensive. Many systems materialise a rolling window as a cache.
- **Sorted list versus interval tree.** A sorted list per room per day is simple and adequate; an interval tree scales to "any room, any time" queries.
- **Attendee conflicts as an error versus a warning.** Hard-blocking is strict and annoying; warning is what real calendars do.
- **Series edits: this occurrence, this and future, or all.** Three different semantics, and supporting all three means splitting a series at a date — worth naming as the real implementation cost.""",
            ),
            (
                "Common Mistakes",
                """- Closed intervals, making back-to-back meetings look like conflicts
- Storing a recurring meeting as a materialised list of occurrences
- Storing a UTC offset instead of a zone, so meetings drift at daylight saving
- Scanning all bookings for a conflict instead of using the sorted neighbours
- No exception model, so cancelling one occurrence requires breaking the series
- Check-then-book with no atomicity, allowing two rooms to be double-booked""",
            ),
            (
                "Evolution Under Pressure",
                """**"Two organisers book the same room simultaneously."** Same pattern as seat booking: a conditional insert guarded by an overlap check inside one transaction, or a unique constraint on a room-plus-time-slot table. Read-then-write is the bug.

**"Ten thousand rooms across twenty offices."** Partition conflict data by room, and index by room and day so a query never scans globally. Room search is filtered by building, capacity and equipment before any time check.

**"Find a slot for twelve people across three timezones."** Merge busy intervals across all twelve plus the room, then walk the gaps — and constrain the search to the intersection of everyone's working hours in their own local time, which is where the zone model pays off again.

**"Edit this and all future occurrences."** Split the series: end the original rule the day before, create a new series from that date with the new rule, and carry forward only the overrides after the split point.

**"Attendee declines."** Attendance is per occurrence, not per series, so it lives alongside overrides keyed by date. A boolean on the series cannot express "declined just this week".

**"Room equipment requirements."** A capability set on the room and a filter before the time search — the same shape as the electric-charging spot in the parking lot.""",
            ),
            (
                "Interviewer Follow-up Questions",
                """**"How do you detect a conflict?"** Half-open interval overlap: `aStart < bEnd && bStart < aEnd`. Against a sorted, non-overlapping set of bookings, only the neighbours of the insertion point can overlap, so it is O(log n).

**"How do you store a recurring meeting?"** As a rule — local start time, duration, zone, frequency, until — plus a set of cancelled dates and a map of overrides. Occurrences are computed for the window being viewed, never stored.

**"Why store a zone rather than an offset?"** Because a weekly 10am meeting must stay at 10am local across a daylight-saving change. An offset freezes the wrong thing and shifts every occurrence by an hour.

**"How do you suggest the earliest free slot?"** Merge the busy intervals of the room and all attendees, then walk the gaps for the first one long enough, bounded by the intersection of working hours.

**"Two people book the same room at once?"** Make the booking a conditional write — a transaction with an overlap check, or a uniqueness constraint — so exactly one succeeds and the other retries.""",
            ),
            (
                "Interview Tip",
                """Get the interval convention and the timezone model out early. Both are one sentence and both prevent a whole class of bug.

> "Two conventions first. Intervals are half-open, so 10-to-11 and 11-to-12 do not conflict — otherwise every back-to-back booking looks like a clash. And a recurring meeting stores a local time plus a `ZoneId`, not a UTC instant, because 'every Tuesday at 10am' has to stay at 10am local when the clocks change. Occurrences get computed for the window being displayed rather than stored as rows."

Three decisions, each of which an interviewer would otherwise have to dig for.""",
            ),
        ],
        [
            "Use half-open intervals or every back-to-back booking looks like a conflict.",
            "Store a recurrence rule plus exceptions, never a materialised list of occurrences.",
            "Store a ZoneId, not an offset, so recurring local times survive daylight saving.",
            "Against sorted non-overlapping bookings, only the neighbours can conflict.",
            "Suggesting a slot is merge-the-busy-intervals and walk the gaps.",
        ],
        [
            "How do you detect whether two meetings conflict?",
            "How do you model a recurring meeting with a cancelled occurrence?",
            "Why store a timezone rather than an offset?",
            "How do you find the earliest slot that works for everyone?",
        ],
    )


def _ride_sharing_topic() -> dict:
    return _case(
        "ride-sharing-lld",
        "Practice: Ride Sharing",
        "Matching, pricing and trip state — the LLD half of the Uber question.",
        "Riders, drivers, matching and fares, with the state machine and the spatial index that make it work.",
        "HARD",
        35,
        14,
        "Ride sharing is usually asked as a system design problem, but the low-level design version is a good interview in its own right: it has a genuine state machine, a matching problem that needs a spatial index, and a pricing model that is an obvious strategy. The trick is keeping the trip aggregate small while the matching service does the heavy work.",
        [
            (
                "Why It Matters",
                """Three things make this problem discriminating.

**The trip is a state machine and its transitions have real rules.** You cannot start a trip that was cancelled, you cannot match one that is already matched, and two drivers must never accept the same request. Modelling it with a status string and no transition guard produces exactly those bugs.

**Matching needs a spatial index.** Scanning every driver to find the nearest is O(n) per request and the interviewer will say so. Geohash, quadtree or an S2 cell index are the expected answers.

**Pricing and matching must be separable.** Surge, promotions and airport surcharges change constantly; the matching algorithm changes rarely. If they live in one class, a pricing experiment risks the dispatch path.""",
            ),
            (
                "Requirements & Scope",
                """**Functional**

- A rider requests a ride from a pickup to a destination.
- The system matches a nearby available driver.
- The driver accepts, arrives, starts and completes the trip.
- Fare is computed from distance, time and surge.
- Either party can cancel, with a policy-dependent fee.

**Out of scope:** navigation and routing, payments processing, driver onboarding, the real-time location stream's transport.

**Assumptions**

- Driver locations update every few seconds.
- Matching happens server-side; drivers may decline.
- One city per matching instance to begin with.""",
            ),
            (
                "How It Works",
                """### Trip as a state machine

```java
public sealed interface TripState
    permits Requested, Matched, DriverArrived, InProgress, Completed, Cancelled {}

public record Requested(Instant at) implements TripState {}
public record Matched(DriverId driver, Instant at) implements TripState {}
public record InProgress(DriverId driver, Instant startedAt) implements TripState {}
public record Completed(DriverId driver, Money fare, Instant endedAt) implements TripState {}
public record Cancelled(CancelledBy by, Money fee, Instant at) implements TripState {}
```

States carry their data: a matched trip has a driver, a completed trip has a fare, a cancelled trip has who cancelled and what it cost. None of that can be null in a state where it does not belong, which a status string plus nullable columns cannot express.

```java
public final class Trip {
    private final TripId id;
    private final RiderId rider;
    private final Location pickup, destination;
    private TripState state = new Requested(Instant.now());

    public void match(DriverId driver, Instant now) {
        if (!(state instanceof Requested)) throw new IllegalTransition(state, "MATCHED");
        state = new Matched(driver, now);
    }
}
```

Every transition is guarded. Because the interface is sealed, a `switch` over `TripState` is exhaustiveness-checked — adding a `Returned` state produces compile errors everywhere it must be handled.

### The matching service owns the hard part

```java
public interface DriverIndex {
    List<DriverSnapshot> nearby(Location centre, Distance radius, int limit);
    void updateLocation(DriverId driver, Location location, Instant at);
    void setAvailability(DriverId driver, boolean available);
}

public interface MatchingPolicy {
    Optional<DriverId> choose(Trip trip, List<DriverSnapshot> candidates);
}
```

`DriverIndex` is backed by a geospatial structure — a geohash prefix map, a quadtree, or S2 cells. The key insight to state: **nearest by straight-line distance is not nearest by driving time**, so the policy scores candidates on estimated time to pickup, current rating, and how long the request has waited.

The waiting term is the same anti-starvation idea as the elevator: without it, a request in a sparse area can be passed over indefinitely.

### Offers, not assignments

A driver can decline, so matching is an offer with a timeout:

```java
public final class Matching {
    public void attemptMatch(Trip trip) {
        List<DriverSnapshot> candidates = index.nearby(trip.pickup(), Distance.km(5), 10);
        policy.choose(trip, candidates).ifPresentOrElse(
            driver -> offers.create(trip.id(), driver, Duration.ofSeconds(15)),   // expiring offer
            ()     -> retryQueue.scheduleRetry(trip.id(), Duration.ofSeconds(5)));
    }

    public void onOfferAccepted(OfferId offer, DriverId driver) {
        if (!offers.claim(offer, driver)) return;    // atomic: another driver or expiry won
        trips.require(offers.tripFor(offer)).match(driver, clock.instant());
    }
}
```

`offers.claim` is a conditional update — exactly the same atomicity technique as seat booking and parking spots. Two drivers tapping accept simultaneously must produce one winner, and the loser must see "this ride is no longer available" rather than a duplicate assignment.

### Fare as composed strategies

```java
public interface FarePolicy { Money quote(TripFacts facts); }

Money fare = new PromoDiscount(
                 new AirportSurcharge(
                     new SurgeMultiplier(
                         new BaseDistanceTimeFare(rates), surgeIndex),
                     airports),
                 promoCode)
             .quote(facts);
```

The composition order is a business rule and worth narrating: surge applies to the base fare, the airport surcharge is added after surge, and the promo discount applies last to the total. Getting that order wrong changes what customers pay, so it belongs in the wiring where it can be read in one place.""",
            ),
            (
                "Example",
                """One trip, including the contended accept.

A rider requests a ride. A `Trip` is created in `Requested`. The matching service asks the index for up to ten available drivers within five kilometres of the pickup — a geohash prefix lookup, not a scan of every driver in the city.

Seven candidates come back. The policy scores them on estimated time to pickup rather than straight-line distance, so a driver two kilometres away across a river loses to one three kilometres away on the same side. The top candidate gets a fifteen-second offer.

Two drivers happen to receive offers for the same trip because a retry fired just as the first offer was expiring. Both tap accept. `offers.claim` is a conditional update, so exactly one succeeds; the other driver's app shows the ride as taken. The trip transitions `Requested` to `Matched`, and the guard would have thrown if it had already been matched — a second layer of protection at the aggregate.

The driver arrives (`DriverArrived`), starts (`InProgress`), and completes. On completion the fare policy chain runs: base fare from distance and time, multiplied by the surge at request time — frozen at request, not at completion, or the rider sees a different price than they agreed — plus the airport surcharge, minus the promo. The trip moves to `Completed` carrying the fare.

Freezing the surge at request time is the detail worth volunteering; it is a real product rule and it falls out of passing `TripFacts` captured up front.""",
            ),
            (
                "Trade-offs",
                """- **Push offers versus a broadcast pool.** Sequential offers give control and add latency per decline; broadcasting to several drivers fills faster and creates the contended-accept problem — which you need to solve either way.
- **Geohash versus quadtree.** Geohash is simple, prefix-queryable and has edge effects at cell boundaries that require checking neighbours. Quadtrees adapt to density and are more work to maintain under constant updates.
- **Nearest by distance versus by ETA.** Distance is free and wrong near rivers and one-way systems; ETA needs a routing service on the critical path.
- **Surge at request versus at completion.** At request is honest to the rider and exposes the platform to a trip that takes far longer than expected.""",
            ),
            (
                "Common Mistakes",
                """- Trip status as a string with no transition guard
- Scanning all drivers to find the nearest instead of using a spatial index
- Assigning a driver directly rather than making an expiring offer they can decline
- No atomic claim, so two drivers can accept the same request
- Pricing logic inside the matching service, so a pricing change risks dispatch
- Computing surge at completion, so the rider is quoted one price and charged another""",
            ),
            (
                "Evolution Under Pressure",
                """**"A driver's app loses connection mid-trip."** The trip stays `InProgress` and location updates stop. A watchdog on stale location escalates to support rather than auto-cancelling — auto-cancelling a trip that is actually happening is worse than a delayed alert.

**"Pool rides with several passengers."** The trip aggregate gains multiple legs with an ordered stop list, and matching becomes a routing problem — insert a new rider into an existing route if the detour cost is acceptable. That is a substantially harder matching policy behind the same interface.

**"A hundred thousand drivers in one city."** The index must be partitioned by geohash prefix so updates and queries touch one shard. Location updates at several per second per driver dominate the write load, so they go to an in-memory store, not a relational database.

**"Rider cancels after the driver has driven ten minutes."** A `CancellationPolicy` decides the fee from the trip state and elapsed time. Because state carries timestamps, the policy has everything it needs without querying elsewhere.

**"Two matching instances double-assign a driver."** Availability must be claimed atomically in the shared store, not held in instance memory. Same conditional-update pattern again — it appears in every one of these problems, which is worth naming.

**"How do you test matching?"** A fake `DriverIndex` returning scripted candidates and an injected clock. The policy is a pure function from a trip and candidates to a choice, so it can be tested exhaustively with no infrastructure.""",
            ),
            (
                "Interviewer Follow-up Questions",
                """**"How do you find nearby drivers?"** A spatial index — geohash cells, a quadtree or S2 — queried by prefix, with neighbouring cells checked to handle boundary effects. Never a scan over all drivers.

**"Two drivers accept at the same moment?"** The offer is claimed with a conditional update, so exactly one wins and the other is told the ride is gone. The trip's own transition guard is a second line of defence.

**"When is surge calculated?"** At request time and frozen into the trip facts, so the rider is charged the price they were quoted.

**"How do you stop a request in a quiet area being ignored forever?"** An aging term in the matching score, exactly like the elevator, plus a widening search radius on each retry.

**"Why is the trip a sealed state hierarchy?"** Because each state carries different data — a matched trip has a driver, a completed one has a fare — and sealing gives exhaustiveness checking so adding a state surfaces every place that must handle it.""",
            ),
            (
                "Interview Tip",
                """Separate the three concerns in your first answer. It frames the whole design and shows you know where the difficulty lives.

> "Three pieces. `Trip` is a small aggregate that is really a state machine with guarded transitions — matched, arrived, in progress, completed, cancelled. Matching is a separate service over a spatial index, because finding nearby drivers by scanning is O(n) and the interesting part is scoring by ETA with an aging term so quiet areas do not starve. And fare is a composed chain of policies, because surge and promotions change weekly while matching does not."

Three sentences, three abstractions, each justified by what changes and how often.""",
            ),
        ],
        [
            "Trip is a sealed state machine whose states carry their own data.",
            "Matching needs a spatial index; scanning all drivers is the wrong answer.",
            "Offers expire and are claimed atomically, so two drivers cannot accept one ride.",
            "Score by estimated time to pickup with an aging term to prevent starvation.",
            "Freeze surge at request time so the quoted price is the charged price.",
        ],
        [
            "How do you find nearby available drivers efficiently?",
            "What happens when two drivers accept the same request?",
            "When is the surge multiplier computed, and why does it matter?",
            "How do you stop requests in low-density areas from starving?",
        ],
    )


def _deck_of_cards_topic() -> dict:
    return _case(
        "deck-of-cards",
        "Practice: Deck of Cards & Blackjack",
        "A small modelling warm-up that tests enums, shuffling correctness and where game rules live.",
        "Cards, decks, hands and a dealer — the short problem where the details decide the score.",
        "EASY",
        36,
        12,
        "Deck of cards is often a warm-up or a phone-screen question, and it is scored on details rather than scale: a correct shuffle, immutable cards, rules that live outside the deck, and the ace-valuation rule in blackjack. It is short enough that getting the small things right is the whole signal.",
        [
            (
                "Why It Matters",
                """Three specific details separate answers here, and all three are cheap to get right if you know them.

**The shuffle.** The naive "swap each element with a random index anywhere" is not uniform — it produces a biased distribution. Fisher-Yates swapping with an index from the unshuffled remainder is uniform, and knowing the difference is a genuine correctness point.

**Where rules live.** A `Deck` that knows about blackjack is wrong: the same deck plays poker. Card values are game-specific, so valuation belongs in the game, not on the card.

**Ace handling.** An ace is 1 or 11 depending on the rest of the hand, and it is the one piece of real logic in blackjack. Hard-coding 11 and subtracting 10 on a bust works and is worth expressing clearly.""",
            ),
            (
                "Requirements & Scope",
                """**Functional**

- Represent a standard 52-card deck.
- Shuffle uniformly; deal cards to hands.
- Support a multi-deck shoe with a reshuffle threshold.
- Play a round of blackjack: deal, hit, stand, dealer plays to 17, settle.

**Out of scope:** betting systems beyond a simple wager, splitting and insurance unless asked, UI, networking.

**Assumptions**

- Randomness is injected so games are reproducible in tests.
- One table, one dealer, several players.""",
            ),
            (
                "How It Works",
                """### Cards are immutable values

```java
public enum Suit { CLUBS, DIAMONDS, HEARTS, SPADES }

public enum Rank {
    TWO, THREE, FOUR, FIVE, SIX, SEVEN, EIGHT, NINE, TEN, JACK, QUEEN, KING, ACE
}

public record Card(Rank rank, Suit suit) {
    @Override public String toString() { return rank + " of " + suit; }
}
```

No value on the card. A king is worth 10 in blackjack, 13 in some trick games and nothing in others — so valuation is the game's job. Putting `int value()` on `Card` is the modelling mistake this problem is designed to catch.

### The deck deals and does nothing else

```java
public final class Deck {
    private final List<Card> cards;
    private int nextIndex = 0;
    private final Random random;

    public static Deck standard(Random random) {
        List<Card> cards = new ArrayList<>(52);
        for (Suit suit : Suit.values()) {
            for (Rank rank : Rank.values()) cards.add(new Card(rank, suit));
        }
        return new Deck(cards, random);
    }

    public void shuffle() {
        for (int i = cards.size() - 1; i > 0; i--) {
            int j = random.nextInt(i + 1);          // from the UNSHUFFLED remainder [0, i]
            Collections.swap(cards, i, j);
        }
        nextIndex = 0;
    }

    public Card deal() {
        if (nextIndex >= cards.size()) throw new DeckExhausted();
        return cards.get(nextIndex++);
    }

    public int remaining() { return cards.size() - nextIndex; }
}
```

Two points worth narrating. `random.nextInt(i + 1)` is the correct Fisher-Yates bound — using `nextInt(cards.size())` instead produces a biased permutation, and it is a bug that is invisible without a statistical test. And `Random` is injected, so a test can seed it and assert an exact deal.

Dealing by advancing an index rather than removing from the front avoids O(n) shifts and keeps the dealt cards available for a burn-card or audit requirement.

### A shoe is several decks

```java
public final class Shoe {
    private final List<Card> cards = new ArrayList<>();
    private int nextIndex = 0;
    private final double reshuffleAt;              // e.g. 0.25 of the shoe remaining

    public Card deal() {
        if (needsReshuffle()) reshuffle();
        return cards.get(nextIndex++);
    }

    private boolean needsReshuffle() {
        return (cards.size() - nextIndex) < cards.size() * reshuffleAt;
    }
}
```

Casinos reshuffle before the shoe is exhausted, which is both realistic and a natural place for a threshold parameter.

### Game rules live in the game

```java
public final class BlackjackHand {
    private final List<Card> cards = new ArrayList<>();

    public int bestValue() {
        int total = 0;
        int aces = 0;
        for (Card card : cards) {
            total += switch (card.rank()) {
                case JACK, QUEEN, KING -> 10;
                case ACE -> { aces++; yield 11; }
                default -> card.rank().ordinal() + 2;
            };
        }
        while (total > 21 && aces > 0) {           // demote aces from 11 to 1 as needed
            total -= 10;
            aces--;
        }
        return total;
    }

    public boolean isBust()      { return bestValue() > 21; }
    public boolean isBlackjack() { return cards.size() == 2 && bestValue() == 21; }
}
```

The ace loop is the whole trick: count aces as 11, then demote one at a time while busting. It handles a hand of three aces correctly — 11+1+1 = 13 — without any special casing.

### The dealer is a strategy

```java
public interface DealerStrategy {
    boolean shouldHit(BlackjackHand hand);
}

public final class StandOnSoft17 implements DealerStrategy {
    public boolean shouldHit(BlackjackHand hand) { return hand.bestValue() < 17; }
}
```

House rules vary — hit or stand on a soft 17 is a real variation — so it is a strategy, not an `if` inside the game loop.""",
            ),
            (
                "Example",
                """A round, with the ace case made explicit.

Deck shuffled with a seeded `Random` so the test is reproducible. Player is dealt ace of spades and six of hearts. `bestValue` counts the ace as 11, giving 17 — a soft 17, because the ace can still be demoted.

The player hits and receives a nine. Total is 11 + 6 + 9 = 26, which busts, so the loop demotes the ace: 26 - 10 = 16, one ace remaining at 1. The hand is 16 and not bust. Without the demotion loop the player would have lost a hand they are still playing.

The player hits again and gets a king: 16 + 10 = 26. No aces left at 11, so the loop cannot help. Bust.

The dealer then plays by strategy — hitting while below 17 — and settlement compares the hands. Note where each rule lived: card values in the hand, hitting policy in the dealer strategy, settlement in the game. The `Deck` participated in none of it, which is the design point.""",
            ),
            (
                "Trade-offs",
                """- **Deal by index versus removing from a list.** Index is O(1) and keeps history; removing from the front is O(n) and loses the dealt sequence.
- **Value on the card versus in the game.** On the card is convenient and wrong for a multi-game deck; in the game is correct and repeated per game.
- **Enum ordinal arithmetic.** `rank.ordinal() + 2` is compact and breaks silently if someone reorders the enum. An explicit value field per constant is safer and slightly more code.
- **Injected `Random` versus `SecureRandom`.** Injected is testable; a real gaming system needs a cryptographically secure source, and saying so shows awareness of the domain.""",
            ),
            (
                "Common Mistakes",
                """- A biased shuffle from choosing the swap index over the whole array
- Putting a blackjack value on `Card`, coupling the deck to one game
- Mutable cards, so a dealt card can be changed in a hand
- Treating an ace as always 11 or always 1
- Using an unseeded `Random`, making every test non-reproducible
- Dealer logic inline in the game loop rather than behind a strategy""",
            ),
            (
                "Evolution Under Pressure",
                """**"Add splitting and doubling down."** A player now has several hands, so the model becomes a player with a list of hands each with its own wager. Split is only legal on a matching pair, which is a rule on the hand.

**"Support poker as well."** The deck and card are unchanged — which is the payoff of keeping values out of `Card`. A poker hand evaluator is a new class ranking five-card combinations, and it shares nothing with blackjack but the deck.

**"Multiple players at one table."** A `Table` with an ordered list of players, a dealer, and a round loop. Turn order and settlement move there; the hand and deck are untouched.

**"Card counting must be impossible."** Reshuffle the shoe at a randomised penetration point rather than a fixed one, and use a cryptographically secure random source.

**"How do you test that the shuffle is fair?"** Not by inspection. Run many shuffles of a small deck with a seeded source and assert that each permutation appears within expected bounds — a chi-squared test. Saying that you would test it statistically is the right answer.

**"Make it thread-safe for an online table."** Dealing mutates the index, so the shoe needs a lock or the table must serialise turns. In a real game the turn order already serialises play, so the lock is on the shoe only.""",
            ),
            (
                "Interviewer Follow-up Questions",
                """**"How do you shuffle correctly?"** Fisher-Yates: walk from the end, swap each element with a random index from the unshuffled portion inclusive of the current one. Choosing across the whole array biases the result.

**"Where does the value of a card live?"** In the game, not on the card. A king is 10 in blackjack and 13 elsewhere, so putting a value on `Card` couples the deck to one game.

**"How do you handle aces?"** Count each as 11, then demote one at a time by 10 while the total exceeds 21. That handles multiple aces without special cases.

**"How do you make a card game testable?"** Inject the random source and seed it, so a test can assert an exact sequence of deals and an exact outcome.

**"Why is `Card` a record?"** It is a value: two aces of spades from different decks are interchangeable, it is immutable, and equality by value is what a hand needs.""",
            ),
            (
                "Interview Tip",
                """This problem is scored on details, so state the two that matter before writing much code.

> "Two things I want to get right. `Card` is an immutable record with a rank and a suit and no value — a king is 10 in blackjack and 13 in other games, so valuation belongs to the game. And the shuffle is Fisher-Yates picking from the unshuffled remainder, because picking a random index across the whole array gives a biased permutation. I will inject `Random` so a test can seed it and assert an exact deal."

Three sentences, and each one is a thing most candidates get wrong.""",
            ),
        ],
        [
            "Fisher-Yates picks from the unshuffled remainder; picking across the whole array is biased.",
            "Card values are game-specific, so valuation belongs in the game, not on Card.",
            "Count aces as 11 and demote by 10 while busting — it handles multiple aces naturally.",
            "Inject the random source so deals are reproducible in tests.",
            "Deal by advancing an index rather than removing from the front of a list.",
        ],
        [
            "How do you shuffle a deck uniformly?",
            "Where should a card's value live, and why?",
            "How do you value an ace in blackjack?",
            "How would you make a card game deterministic for testing?",
        ],
    )


# ---------------------------------------------------------------------------
# Exporter
# ---------------------------------------------------------------------------


def ood_topics() -> list[dict]:
    """Every Object-Oriented Design topic, in curriculum order."""
    topics = [
        # Foundations
        _oop_fundamentals_topic(),
        _class_relationships_topic(),
        _solid_topic(),
        _design_heuristics_topic(),
        _composition_topic(),
        _object_contracts_topic(),
        # Designing the seams
        _interfaces_topic(),
        _dependency_injection_topic(),
        # Creational patterns
        _factory_topic(),
        _builder_singleton_topic(),
        # Structural patterns
        _adapter_facade_proxy_topic(),
        _decorator_topic(),
        # Behavioural patterns
        _strategy_topic(),
        _observer_topic(),
        _state_topic(),
        _command_chain_topic(),
        # Architecture in the small
        _layering_topic(),
        _concurrency_topic(),
        # The interview method
        _lld_method_topic(),
        # Case studies
        _parking_lot_topic(),
        _vending_machine_topic(),
        _elevator_topic(),
        _library_topic(),
        _chess_topic(),
        _rate_limiter_topic(),
        _atm_topic(),
        _splitwise_topic(),
        _movie_booking_topic(),
        _filesystem_topic(),
        _lru_cache_topic(),
        _logging_framework_topic(),
        _notification_service_topic(),
        _text_editor_topic(),
        _meeting_scheduler_topic(),
        _ride_sharing_topic(),
        _deck_of_cards_topic(),
    ]

    orders = [topic["order"] for topic in topics]
    if orders != sorted(orders) or len(set(orders)) != len(orders):
        raise RuntimeError(f"OOD topic orders must be unique and ascending: {orders}")

    slugs = [topic["slug"] for topic in topics]
    if len(set(slugs)) != len(slugs):
        raise RuntimeError("duplicate OOD topic slug")

    lesson_slugs = [lesson["slug"] for topic in topics for lesson in topic["lessons"]]
    if len(set(lesson_slugs)) != len(lesson_slugs):
        raise RuntimeError("duplicate OOD lesson slug")

    # These slugs shipped in the original catalog. Progress, deep links and the search
    # index all match on slug, so losing one silently resets a learner's progress.
    original = {
        "oop-fundamentals", "solid-principles", "composition-vs-inheritance", "interfaces",
        "dependency-injection", "factory-pattern", "strategy-pattern", "observer-pattern",
        "builder-pattern", "decorator-pattern", "low-level-design", "parking-lot",
        "vending-machine", "elevator", "library", "chess", "ood-rate-limiter",
    }
    missing_topics = original - set(slugs)
    if missing_topics:
        raise RuntimeError(f"dropped original OOD topic slugs: {sorted(missing_topics)}")
    missing_lessons = original - set(lesson_slugs)
    if missing_lessons:
        raise RuntimeError(f"dropped original OOD lesson slugs: {sorted(missing_lessons)}")

    return topics
