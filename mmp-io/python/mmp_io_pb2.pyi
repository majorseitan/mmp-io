from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class Variant(_message.Message):
    __slots__ = ()
    CHROMOSOME_FIELD_NUMBER: _ClassVar[int]
    POSITION_FIELD_NUMBER: _ClassVar[int]
    REF_FIELD_NUMBER: _ClassVar[int]
    ALT_FIELD_NUMBER: _ClassVar[int]
    chromosome: int
    position: int
    ref: str
    alt: str
    def __init__(self, chromosome: _Optional[int] = ..., position: _Optional[int] = ..., ref: _Optional[str] = ..., alt: _Optional[str] = ...) -> None: ...

class AssociationStatistic(_message.Message):
    __slots__ = ()
    PVALUE_FIELD_NUMBER: _ClassVar[int]
    BETA_FIELD_NUMBER: _ClassVar[int]
    SEBETA_FIELD_NUMBER: _ClassVar[int]
    AF_FIELD_NUMBER: _ClassVar[int]
    pValue: float
    beta: float
    sebeta: float
    af: float
    def __init__(self, pValue: _Optional[float] = ..., beta: _Optional[float] = ..., sebeta: _Optional[float] = ..., af: _Optional[float] = ...) -> None: ...

class SummaryRecord(_message.Message):
    __slots__ = ()
    VARIANT_FIELD_NUMBER: _ClassVar[int]
    ASSOCIATIONSTATISTIC_FIELD_NUMBER: _ClassVar[int]
    variant: Variant
    associationStatistic: AssociationStatistic
    def __init__(self, variant: _Optional[_Union[Variant, _Mapping]] = ..., associationStatistic: _Optional[_Union[AssociationStatistic, _Mapping]] = ...) -> None: ...
