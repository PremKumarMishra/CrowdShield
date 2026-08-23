from pydantic import BaseModel,Field
from typing import Annotated,List,Literal

class Callibration(BaseModel):
    camera_points : Annotated[List[List],Field(title="Camera Points",description="Camera Points Callibrations",min_length=4)]
    venue_points : Annotated[List[List],Field(title="Venue Points",description="Venue Points Callibrations",min_length=4)]

class Camera(BaseModel):
    id: Annotated[str,Field(title="ID",description="Camera ID",min_length=5,max_length=6)]
    name: Annotated[str,Field(title="Name",description="Camera Name",min_length=6,max_length=6)]
    x: Annotated[float,Field(title="Position_X",description="X Coordinate Of The Camera",ge=0)]
    y: Annotated[float,Field(title="Position_Y",description="Y Coordinate Of The Camera",ge=0)]
    direction:Annotated[Literal['FORWARD','BACKWARD','LEFT','RIGHT'],Field(title="Crowd Direction",description="Direction Of Crowd From Camera POV (FORWARD,BACKWARD,LEFT,RIGHT)")]
    callibration : Callibration


class Gate(BaseModel):
    id: Annotated[str,Field(title="ID",description="Gate ID",min_length=5,max_length=6)]
    name: Annotated[str,Field(title="Name",description="Gate Name",min_length=6,max_length=6)]
    x: Annotated[float,Field(title="Position_X",description="X Coordinate Of The Gate",ge=0)]
    y: Annotated[float,Field(title="Position_Y",description="Y Coordinate Of The Gate",ge=0)]

class VenueConfig(BaseModel):
    dimensions: Annotated[List[int],Field(title="Dimension",description="Dimension Of Venue",max_length=2,min_length=2)]
    camera: Camera
    gates : List[Gate]

    

