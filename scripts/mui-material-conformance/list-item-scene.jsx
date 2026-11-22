import React from "react";
import List from "@quick-list";
import Row from "@quick-row";
import Text from "@quick-text";
import Icon from "@quick-icon";
import Header from "@quick-header";
const titles = [
  "Team practice",
  "Registration closes",
  "Bring a pencil",
  "Room assignment",
];
export function scene({
  reverse = false,
  detail = "Monday",
  dense = false,
  row = {},
  settings = true,
  rows = true,
} = {}) {
  return (
    <>
      {rows &&
        ["Events", "Notes"].map((section, i) => {
          const group = titles.slice(i * 2, i * 2 + 2);
          return (
            <List dense={dense} key={section}>
              <Header component="div">{section}</Header>
              {(reverse ? group.reverse() : group).map((title) => (
                <Row key={title} data-title={title} {...row}>
                  <Text primary={title} secondary={detail} />
                </Row>
              ))}
            </List>
          );
        })}
      {settings && (
        <List dense={dense}>
          <Header component="div">Quick Settings</Header>
          {["Notifications", "Cloud Sync", "Retro Thrusters"].map((label) => (
            <Row
              key={label}
              {...row}
              secondaryAction={<input type="checkbox" aria-label={label} />}
            >
              <Icon className="min-w-9">
                <span aria-hidden="true">•</span>
              </Icon>
              <Text primary={label} />
            </Row>
          ))}
        </List>
      )}
    </>
  );
}
