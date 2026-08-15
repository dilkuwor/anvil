from __future__ import annotations

import re

# java.lang is imported automatically by the compiler and is omitted here.
JDK_TYPES: dict[str, str] = {
    # java.util
    "AbstractCollection": "java.util.AbstractCollection",
    "AbstractList": "java.util.AbstractList",
    "AbstractMap": "java.util.AbstractMap",
    "AbstractQueue": "java.util.AbstractQueue",
    "AbstractSequentialList": "java.util.AbstractSequentialList",
    "AbstractSet": "java.util.AbstractSet",
    "ArrayDeque": "java.util.ArrayDeque",
    "ArrayList": "java.util.ArrayList",
    "Arrays": "java.util.Arrays",
    "Base64": "java.util.Base64",
    "BitSet": "java.util.BitSet",
    "Calendar": "java.util.Calendar",
    "Collection": "java.util.Collection",
    "Collections": "java.util.Collections",
    "Comparator": "java.util.Comparator",
    "Currency": "java.util.Currency",
    "Date": "java.util.Date",
    "Deque": "java.util.Deque",
    "Dictionary": "java.util.Dictionary",
    "EnumMap": "java.util.EnumMap",
    "EnumSet": "java.util.EnumSet",
    "Enumeration": "java.util.Enumeration",
    "EventListener": "java.util.EventListener",
    "Formattable": "java.util.Formattable",
    "Formatter": "java.util.Formatter",
    "GregorianCalendar": "java.util.GregorianCalendar",
    "HashMap": "java.util.HashMap",
    "HashSet": "java.util.HashSet",
    "Hashtable": "java.util.Hashtable",
    "IdentityHashMap": "java.util.IdentityHashMap",
    "Iterator": "java.util.Iterator",
    "LinkedHashMap": "java.util.LinkedHashMap",
    "LinkedHashSet": "java.util.LinkedHashSet",
    "LinkedList": "java.util.LinkedList",
    "List": "java.util.List",
    "ListIterator": "java.util.ListIterator",
    "ListResourceBundle": "java.util.ListResourceBundle",
    "Locale": "java.util.Locale",
    "Map": "java.util.Map",
    "MissingResourceException": "java.util.MissingResourceException",
    "NavigableMap": "java.util.NavigableMap",
    "NavigableSet": "java.util.NavigableSet",
    "NoSuchElementException": "java.util.NoSuchElementException",
    "Objects": "java.util.Objects",
    "Observable": "java.util.Observable",
    "Observer": "java.util.Observer",
    "Optional": "java.util.Optional",
    "OptionalDouble": "java.util.OptionalDouble",
    "OptionalInt": "java.util.OptionalInt",
    "OptionalLong": "java.util.OptionalLong",
    "PriorityQueue": "java.util.PriorityQueue",
    "Properties": "java.util.Properties",
    "Queue": "java.util.Queue",
    "Random": "java.util.Random",
    "ResourceBundle": "java.util.ResourceBundle",
    "Scanner": "java.util.Scanner",
    "Set": "java.util.Set",
    "SortedMap": "java.util.SortedMap",
    "SortedSet": "java.util.SortedSet",
    "Spliterator": "java.util.Spliterator",
    "Spliterators": "java.util.Spliterators",
    "Stack": "java.util.Stack",
    "StringJoiner": "java.util.StringJoiner",
    "StringTokenizer": "java.util.StringTokenizer",
    "Timer": "java.util.Timer",
    "TimerTask": "java.util.TimerTask",
    "TimeZone": "java.util.TimeZone",
    "TreeMap": "java.util.TreeMap",
    "TreeSet": "java.util.TreeSet",
    "UUID": "java.util.UUID",
    "Vector": "java.util.Vector",
    "WeakHashMap": "java.util.WeakHashMap",
    # java.util.concurrent
    "AbstractExecutorService": "java.util.concurrent.AbstractExecutorService",
    "ArrayBlockingQueue": "java.util.concurrent.ArrayBlockingQueue",
    "BlockingDeque": "java.util.concurrent.BlockingDeque",
    "BlockingQueue": "java.util.concurrent.BlockingQueue",
    "BrokenBarrierException": "java.util.concurrent.BrokenBarrierException",
    "Callable": "java.util.concurrent.Callable",
    "CompletableFuture": "java.util.concurrent.CompletableFuture",
    "CompletionService": "java.util.concurrent.CompletionService",
    "ConcurrentHashMap": "java.util.concurrent.ConcurrentHashMap",
    "ConcurrentLinkedDeque": "java.util.concurrent.ConcurrentLinkedDeque",
    "ConcurrentLinkedQueue": "java.util.concurrent.ConcurrentLinkedQueue",
    "ConcurrentMap": "java.util.concurrent.ConcurrentMap",
    "ConcurrentNavigableMap": "java.util.concurrent.ConcurrentNavigableMap",
    "ConcurrentSkipListMap": "java.util.concurrent.ConcurrentSkipListMap",
    "ConcurrentSkipListSet": "java.util.concurrent.ConcurrentSkipListSet",
    "CopyOnWriteArrayList": "java.util.concurrent.CopyOnWriteArrayList",
    "CopyOnWriteArraySet": "java.util.concurrent.CopyOnWriteArraySet",
    "CountDownLatch": "java.util.concurrent.CountDownLatch",
    "CyclicBarrier": "java.util.concurrent.CyclicBarrier",
    "DelayQueue": "java.util.concurrent.DelayQueue",
    "Exchanger": "java.util.concurrent.Exchanger",
    "Executor": "java.util.concurrent.Executor",
    "ExecutorService": "java.util.concurrent.ExecutorService",
    "Executors": "java.util.concurrent.Executors",
    "Future": "java.util.concurrent.Future",
    "FutureTask": "java.util.concurrent.FutureTask",
    "LinkedBlockingDeque": "java.util.concurrent.LinkedBlockingDeque",
    "LinkedBlockingQueue": "java.util.concurrent.LinkedBlockingQueue",
    "Phaser": "java.util.concurrent.Phaser",
    "PriorityBlockingQueue": "java.util.concurrent.PriorityBlockingQueue",
    "RejectedExecutionException": "java.util.concurrent.RejectedExecutionException",
    "ScheduledExecutorService": "java.util.concurrent.ScheduledExecutorService",
    "ScheduledFuture": "java.util.concurrent.ScheduledFuture",
    "ScheduledThreadPoolExecutor": "java.util.concurrent.ScheduledThreadPoolExecutor",
    "Semaphore": "java.util.concurrent.Semaphore",
    "SynchronousQueue": "java.util.concurrent.SynchronousQueue",
    "ThreadFactory": "java.util.concurrent.ThreadFactory",
    "ThreadPoolExecutor": "java.util.concurrent.ThreadPoolExecutor",
    "TimeUnit": "java.util.concurrent.TimeUnit",
    "TimeoutException": "java.util.concurrent.TimeoutException",
    # java.util.concurrent.atomic
    "AtomicBoolean": "java.util.concurrent.atomic.AtomicBoolean",
    "AtomicInteger": "java.util.concurrent.atomic.AtomicInteger",
    "AtomicIntegerArray": "java.util.concurrent.atomic.AtomicIntegerArray",
    "AtomicLong": "java.util.concurrent.atomic.AtomicLong",
    "AtomicLongArray": "java.util.concurrent.atomic.AtomicLongArray",
    "AtomicReference": "java.util.concurrent.atomic.AtomicReference",
    "AtomicReferenceArray": "java.util.concurrent.atomic.AtomicReferenceArray",
    "LongAdder": "java.util.concurrent.atomic.LongAdder",
    # java.util.function
    "BiConsumer": "java.util.function.BiConsumer",
    "BiFunction": "java.util.function.BiFunction",
    "BinaryOperator": "java.util.function.BinaryOperator",
    "BiPredicate": "java.util.function.BiPredicate",
    "BooleanSupplier": "java.util.function.BooleanSupplier",
    "Consumer": "java.util.function.Consumer",
    "DoubleBinaryOperator": "java.util.function.DoubleBinaryOperator",
    "DoubleConsumer": "java.util.function.DoubleConsumer",
    "DoubleFunction": "java.util.function.DoubleFunction",
    "DoublePredicate": "java.util.function.DoublePredicate",
    "DoubleSupplier": "java.util.function.DoubleSupplier",
    "DoubleToIntFunction": "java.util.function.DoubleToIntFunction",
    "DoubleToLongFunction": "java.util.function.DoubleToLongFunction",
    "DoubleUnaryOperator": "java.util.function.DoubleUnaryOperator",
    "Function": "java.util.function.Function",
    "IntBinaryOperator": "java.util.function.IntBinaryOperator",
    "IntConsumer": "java.util.function.IntConsumer",
    "IntFunction": "java.util.function.IntFunction",
    "IntPredicate": "java.util.function.IntPredicate",
    "IntSupplier": "java.util.function.IntSupplier",
    "IntToDoubleFunction": "java.util.function.IntToDoubleFunction",
    "IntToLongFunction": "java.util.function.IntToLongFunction",
    "IntUnaryOperator": "java.util.function.IntUnaryOperator",
    "LongBinaryOperator": "java.util.function.LongBinaryOperator",
    "LongConsumer": "java.util.function.LongConsumer",
    "LongFunction": "java.util.function.LongFunction",
    "LongPredicate": "java.util.function.LongPredicate",
    "LongSupplier": "java.util.function.LongSupplier",
    "LongToDoubleFunction": "java.util.function.LongToDoubleFunction",
    "LongToIntFunction": "java.util.function.LongToIntFunction",
    "LongUnaryOperator": "java.util.function.LongUnaryOperator",
    "ObjDoubleConsumer": "java.util.function.ObjDoubleConsumer",
    "ObjIntConsumer": "java.util.function.ObjIntConsumer",
    "ObjLongConsumer": "java.util.function.ObjLongConsumer",
    "Predicate": "java.util.function.Predicate",
    "Supplier": "java.util.function.Supplier",
    "ToDoubleBiFunction": "java.util.function.ToDoubleBiFunction",
    "ToDoubleFunction": "java.util.function.ToDoubleFunction",
    "ToIntBiFunction": "java.util.function.ToIntBiFunction",
    "ToIntFunction": "java.util.function.ToIntFunction",
    "ToLongBiFunction": "java.util.function.ToLongBiFunction",
    "ToLongFunction": "java.util.function.ToLongFunction",
    "UnaryOperator": "java.util.function.UnaryOperator",
    # java.util.stream
    "Collector": "java.util.stream.Collector",
    "Collectors": "java.util.stream.Collectors",
    "DoubleStream": "java.util.stream.DoubleStream",
    "IntStream": "java.util.stream.IntStream",
    "LongStream": "java.util.stream.LongStream",
    "Stream": "java.util.stream.Stream",
    "StreamSupport": "java.util.stream.StreamSupport",
    # java.math
    "BigDecimal": "java.math.BigDecimal",
    "BigInteger": "java.math.BigInteger",
    "MathContext": "java.math.MathContext",
    "RoundingMode": "java.math.RoundingMode",
    # java.util.regex
    "Matcher": "java.util.regex.Matcher",
    "Pattern": "java.util.regex.Pattern",
    "PatternSyntaxException": "java.util.regex.PatternSyntaxException",
    # java.text
    "ChoiceFormat": "java.text.ChoiceFormat",
    "Collator": "java.text.Collator",
    "DateFormat": "java.text.DateFormat",
    "DecimalFormat": "java.text.DecimalFormat",
    "MessageFormat": "java.text.MessageFormat",
    "NumberFormat": "java.text.NumberFormat",
    "ParseException": "java.text.ParseException",
    "SimpleDateFormat": "java.text.SimpleDateFormat",
    # java.time
    "Clock": "java.time.Clock",
    "DayOfWeek": "java.time.DayOfWeek",
    "Duration": "java.time.Duration",
    "Instant": "java.time.Instant",
    "LocalDate": "java.time.LocalDate",
    "LocalDateTime": "java.time.LocalDateTime",
    "LocalTime": "java.time.LocalTime",
    "Month": "java.time.Month",
    "MonthDay": "java.time.MonthDay",
    "OffsetDateTime": "java.time.OffsetDateTime",
    "OffsetTime": "java.time.OffsetTime",
    "Period": "java.time.Period",
    "Year": "java.time.Year",
    "YearMonth": "java.time.YearMonth",
    "ZoneId": "java.time.ZoneId",
    "ZoneOffset": "java.time.ZoneOffset",
    "ZonedDateTime": "java.time.ZonedDateTime",
    # java.time.format
    "DateTimeFormatter": "java.time.format.DateTimeFormatter",
    "DateTimeParseException": "java.time.format.DateTimeParseException",
    # java.io / nio (valid, occasionally used)
    "BufferedReader": "java.io.BufferedReader",
    "BufferedWriter": "java.io.BufferedWriter",
    "ByteArrayInputStream": "java.io.ByteArrayInputStream",
    "ByteArrayOutputStream": "java.io.ByteArrayOutputStream",
    "CharArrayReader": "java.io.CharArrayReader",
    "CharArrayWriter": "java.io.CharArrayWriter",
    "Closeable": "java.io.Closeable",
    "File": "java.io.File",
    "IOException": "java.io.IOException",
    "InputStream": "java.io.InputStream",
    "OutputStream": "java.io.OutputStream",
    "PrintWriter": "java.io.PrintWriter",
    "Reader": "java.io.Reader",
    "Serializable": "java.io.Serializable",
    "StringReader": "java.io.StringReader",
    "StringWriter": "java.io.StringWriter",
    "UncheckedIOException": "java.io.UncheckedIOException",
    "Writer": "java.io.Writer",
    "Files": "java.nio.file.Files",
    "Path": "java.nio.file.Path",
    "Paths": "java.nio.file.Paths",
    "ByteBuffer": "java.nio.ByteBuffer",
    "Charset": "java.nio.charset.Charset",
    "StandardCharsets": "java.nio.charset.StandardCharsets",
}

_TYPE_NAME = re.compile(r"\b([A-Z][A-Za-z0-9_]*)\b")
_DEFINED_TYPE = re.compile(
    r"\b(?:class|interface|enum|record)\s+([A-Z][A-Za-z0-9_]*)\b"
)
_IMPORT_LINE = re.compile(r"^import\s+(static\s+)?([a-zA-Z0-9_.]+(?:\.\*)?)\s*;")
_COMMENT_OR_STRING = re.compile(
    r"""
    //[^\n]*
    | /\*.*?\*/
    | "(?:\\.|[^"\\])*"
    | '(?:\\.|[^'\\])*'
    """,
    re.DOTALL | re.VERBOSE,
)


def prepare_source(source: str) -> str:
    """Strip packages and inject any missing JDK imports the solution uses."""
    from app.execution.harness import sanitize_source

    return inject_imports(sanitize_source(source))


def inject_imports(source: str) -> str:
    text = source.replace("\r\n", "\n")
    if not text.endswith("\n"):
        text += "\n"

    import_lines: list[str] = []
    body_lines: list[str] = []
    for line in text.split("\n"):
        stripped = line.strip()
        if stripped.startswith("import ") and stripped.endswith(";"):
            import_lines.append(stripped)
        else:
            body_lines.append(line)

    body = "\n".join(body_lines)
    existing = _existing_coverage(import_lines)
    defined = set(_DEFINED_TYPE.findall(_strip_noise(body)))
    needed: list[str] = []
    for name in _used_type_names(body):
        if name in defined:
            continue
        fqn = JDK_TYPES.get(name)
        if not fqn or _already_imported(fqn, existing):
            continue
        needed.append(fqn)

    extra = [f"import {fqn};" for fqn in sorted(set(needed))]
    if not extra:
        return text

    merged: list[str] = []
    seen: set[str] = set()
    for item in import_lines + extra:
        if item not in seen:
            seen.add(item)
            merged.append(item)
    return "\n".join(merged) + "\n\n" + body.strip() + "\n"


def _used_type_names(source: str) -> set[str]:
    return set(_TYPE_NAME.findall(_strip_noise(source)))


def _strip_noise(source: str) -> str:
    return _COMMENT_OR_STRING.sub(" ", source)


def _existing_coverage(import_lines: list[str]) -> tuple[set[str], set[str]]:
    exact: set[str] = set()
    wildcards: set[str] = set()
    for line in import_lines:
        match = _IMPORT_LINE.match(line.rstrip())
        if not match:
            continue
        target = match.group(2)
        if target.endswith(".*"):
            wildcards.add(target[:-2])
        else:
            exact.add(target)
            simple = target.rsplit(".", 1)[-1]
            exact.add(simple)
    return exact, wildcards


def _already_imported(fqn: str, existing: tuple[set[str], set[str]]) -> bool:
    exact, wildcards = existing
    if fqn in exact or fqn.rsplit(".", 1)[-1] in exact:
        return True
    package = fqn.rsplit(".", 1)[0]
    return package in wildcards
