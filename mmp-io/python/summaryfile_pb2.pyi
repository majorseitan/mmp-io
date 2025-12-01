from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class SummaryHeader(_message.Message):
    __slots__ = ()
    COLUMNS_FIELD_NUMBER: _ClassVar[int]
    columns: _containers.RepeatedScalarFieldContainer[str]
    def __init__(self, columns: _Optional[_Iterable[str]] = ...) -> None: ...

class SummaryValues(_message.Message):
    __slots__ = ()
    VALUES_FIELD_NUMBER: _ClassVar[int]
    values: _containers.RepeatedScalarFieldContainer[str]
    def __init__(self, values: _Optional[_Iterable[str]] = ...) -> None: ...

class SummaryRows(_message.Message):
    __slots__ = ()
    class RowsEntry(_message.Message):
        __slots__ = ()
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: SummaryValues
        def __init__(self, key: _Optional[str] = ..., value: _Optional[_Union[SummaryValues, _Mapping]] = ...) -> None: ...
    ROWS_FIELD_NUMBER: _ClassVar[int]
    rows: _containers.MessageMap[str, SummaryValues]
    def __init__(self, rows: _Optional[_Mapping[str, SummaryValues]] = ...) -> None: ...

class SummaryFile(_message.Message):
    __slots__ = ()
    HEADER_FIELD_NUMBER: _ClassVar[int]
    ROWS_FIELD_NUMBER: _ClassVar[int]
    header: _containers.RepeatedScalarFieldContainer[str]
    rows: _containers.RepeatedCompositeFieldContainer[SummaryRows]
    def __init__(self, header: _Optional[_Iterable[str]] = ..., rows: _Optional[_Iterable[_Union[SummaryRows, _Mapping]]] = ...) -> None: ...
