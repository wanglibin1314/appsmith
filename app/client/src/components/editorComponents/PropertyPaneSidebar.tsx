import classNames from "classnames";
import * as Sentry from "@sentry/react";
import { useSelector } from "react-redux";
import React, { memo, useEffect, useRef, useMemo } from "react";

import PerformanceTracker, {
  PerformanceTransactionName,
} from "utils/PerformanceTracker";
import { getSelectedWidgets } from "selectors/ui";
import WidgetPropertyPane from "pages/Editor/PropertyPane";
import { previewModeSelector } from "selectors/editorSelectors";
import CanvasPropertyPane from "pages/Editor/CanvasPropertyPane";
import useHorizontalResize from "utils/hooks/useHorizontalResize";
import { getIsDraggingForSelection } from "selectors/canvasSelectors";
import MultiSelectPropertyPane from "pages/Editor/MultiSelectPropertyPane";
import { commentModeSelector } from "selectors/commentsSelectors";
import { zIndexLayers } from "constants/CanvasEditorConstants";

type Props = {
  width: number;
  onDragEnd?: () => void;
  onWidthChange: (width: number) => void;
};

export const PropertyPaneSidebar = memo((props: Props) => {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const {
    onMouseDown,
    onMouseUp,
    onTouchStart,
    resizing,
  } = useHorizontalResize(
    sidebarRef,
    props.onWidthChange,
    props.onDragEnd,
    true,
  );
  const isPreviewMode = useSelector(previewModeSelector);
  const isCommentMode = useSelector(commentModeSelector);
  const selectedWidgets = useSelector(getSelectedWidgets);
  const isDraggingForSelection = useSelector(getIsDraggingForSelection);

  PerformanceTracker.startTracking(PerformanceTransactionName.SIDE_BAR_MOUNT);
  useEffect(() => {
    PerformanceTracker.stopTracking();
  });

  /**
   * renders the property pane:
   * 1. if no widget is selected -> CanvasPropertyPane
   * 2. if more than one widget is selected -> MultiWidgetPropertyPane
   * 3. if user is dragging for selection -> CanvasPropertyPane
   * 4. if only one widget is selected -> WidgetPropertyPane
   */
  const propertyPane = useMemo(() => {
    switch (true) {
      case selectedWidgets.length == 0:
        return <CanvasPropertyPane />;
      case selectedWidgets.length > 1:
        return <MultiSelectPropertyPane />;
      case isDraggingForSelection === true:
        return <CanvasPropertyPane />;
      case selectedWidgets.length === 1:
        return <WidgetPropertyPane />;
    }
  }, [selectedWidgets, isDraggingForSelection]);

  return (
    <div className="relative">
      {/* RESIZOR */}
      <div
        className={`absolute top-0 left-0 w-2 h-full -ml-2 group  cursor-ew-resize ${zIndexLayers.RESIZER}`}
        onMouseDown={onMouseDown}
        onTouchEnd={onMouseUp}
        onTouchStart={onTouchStart}
      >
        <div
          className={classNames({
            "w-1 h-full ml-1 bg-transparent group-hover:bg-blue-500 transform transition": true,
            "bg-blue-500": resizing,
          })}
        />
      </div>
      {/* PROPERTY PANE */}
      <div
        className={classNames({
          [`js-property-pane-sidebar t--property-pane-sidebar bg-white flex h-full  border-l border-gray-200 transform transition duration-300 ${zIndexLayers.PROPERTY_PANE}`]: true,
          "relative ": !isPreviewMode,
          "fixed translate-x-full right-0": isPreviewMode || isCommentMode,
        })}
        ref={sidebarRef}
      >
        <div
          className="h-full p-0 overflow-y-auto min-w-72 max-w-104"
          style={{ width: props.width }}
        >
          {propertyPane}
        </div>
      </div>
    </div>
  );
});

PropertyPaneSidebar.displayName = "PropertyPaneSidebar";

export default Sentry.withProfiler(PropertyPaneSidebar);
